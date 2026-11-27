#!/usr/bin/env bash
# Runs after CI on an agent branch (task/* or revert/*). Decides what happens next:
#   all green    -> adversary review
#   tests failed -> feedback to the coder, next round (or escalation if the same failures repeat)
#   size or protected-files failed -> stall, a human or the planner has to split or fix the task
# Env: RESULTS (toJSON(needs)), BRANCH, ISSUE (may be empty), LOGS (folder with downloaded junit artifacts)
source "$(dirname "$0")/lib.sh"
branch=${BRANCH:?}
n=${ISSUE:-}
[[ -z $n && $branch == task/* ]] && n=${branch#task/}
run_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"
pr=$(pr_for_branch "$branch")

# A cancelled run was replaced by a newer CI run on the same branch (or cancelled by hand, which the
# watchdog flags). The newer run reports; acting here would start a second, paid coder round in parallel.
if jq -e '[.[] | .result] | index("cancelled")' <<<"$RESULTS" >/dev/null; then
  log "this CI run was cancelled; leaving the next step to the run that replaced it"
  exit 0
fi

RESULTS=$(jq -c 'del(.head)' <<<"$RESULTS")  # `head` only finds the commit; it is not a check
failed=$(jq -r 'to_entries[] | select(.value.result != "success") | .key' <<<"$RESULTS" | sort)

# Report every check's result as a commit status on the commit CI tested (see report_status in lib.sh).
while IFS=$'\t' read -r job result; do
  [[ $result == success ]] && st=success || st=failure
  report_status "${SHA:-$GITHUB_SHA}" "$job" "$st" "$result"
done < <(jq -r 'to_entries[] | [.key, .value.result] | @tsv' <<<"$RESULTS")

if [[ $branch == revert/* ]]; then
  if [[ -n $failed ]]; then
    alert "The automatic revert PR #$pr failed CI ($(tr '\n' ' ' <<<"$failed")). Main may be broken; please look. [Run]($run_url)"
  else
    dispatch adversary-review.yml "$branch" "" "issue=$n" "pr=$pr"
  fi
  exit 0
fi

if [[ -z $failed ]]; then
  comment "$n" "✅ CI passed on #$pr. Next: adversary review. [Run]($run_url)"
  set_stage "$n" review
  dispatch adversary-review.yml "$branch" "$n" "issue=$n" "pr=$pr"
  exit 0
fi

# Failures only in setup steps (checkout, npm ci, installing the browser) are GitHub or network hiccups the
# coder can't fix. Run CI again once for free instead of paying for a coder round on them.
failed_steps=$(gh api "repos/$GH_REPO/actions/runs/$GITHUB_RUN_ID/jobs" \
  --jq '.jobs[] | select(.conclusion == "failure") | .steps[] | select(.conclusion == "failure") | .name')
code_steps='^(Type check|Build|Unit tests|End-to-end tests|Require the test log|Run guard|Run npx next build)'
if [[ -n $failed_steps ]] && ! grep -qE "$code_steps" <<<"$failed_steps" && [[ -z $(markers "$n" "ci-retry" | grep -xF "$SHA" || true) ]]; then
  comment "$n" "🔁 CI on #$pr failed while setting up ($(tr '\n' ',' <<<"$failed_steps" | sed 's/,$//')), not in the tests. Running CI again once, at no AI cost. [Run]($run_url)
<!-- ci-retry:$SHA -->"
  dispatch ci.yml "$branch" "$n" "issue=$n"
  exit 0
fi

if grep -qxE 'size-check|protected-files' <<<"$failed"; then
  stall "$n" "CI check(s) $(grep -xE 'size-check|protected-files' <<<"$failed" | tr '\n' ' ')failed on #$pr. The task probably needs splitting. [Run]($run_url)"
  exit 0
fi

# Failing tests, from the JUnit files the test jobs uploaded.
failing_tests=$(python3 - "${LOGS:-logs}" <<'PY'
import sys, pathlib, xml.etree.ElementTree as ET
out = []
for f in sorted(pathlib.Path(sys.argv[1]).rglob("*.xml")):
    try:
        root = ET.parse(f).getroot()
    except ET.ParseError:
        continue
    for case in root.iter("testcase"):
        bad = case.find("failure") if case.find("failure") is not None else case.find("error")
        if bad is not None:
            msg = (bad.get("message") or bad.text or "").strip().splitlines()
            out.append(f"- `{case.get('classname','')} › {case.get('name','')}`: {msg[0][:300] if msg else ''}")
print("\n".join(sorted(set(out))))
PY
)
# This run is still going (this job is part of it), so read the failed jobs' logs one by one.
log_tail=$(
  for id in $(gh api "repos/$GH_REPO/actions/runs/$GITHUB_RUN_ID/jobs" --jq '.jobs[] | select(.conclusion == "failure") | .id'); do
    gh api "repos/$GH_REPO/actions/jobs/$id/logs" 2>/dev/null | grep -vE '^\S+ ##\[(group|endgroup)\]' | tail -25
  done | cut -c1-300 | sed 's/```/` ` `/g' || true
)

sig=$(printf '%s\n%s\n' "$failed" "$(sed -E 's/`: .*/`/' <<<"$failing_tests")" | sha256sum | cut -c1-16)
prev_sig=$(last_marker "$n" ci-sig || true)
r=$(last_round "$n"); r=${r:-1}
next=$((r + 1))
max=$(cfg .limits.max_rounds)
b=$(resume_base "$n")
repeat_note=""
if [[ $sig == "$prev_sig" ]] && (( next - b <= max )); then
  next=$((b + max + 1))
  repeat_note=$'\n\nThe same checks failed the same way twice in a row, so the next round goes to the escalation model.'
fi

comment "$n" "❌ **CI failed** on #$pr (round $r): $(tr '\n' ' ' <<<"$failed"). [Run]($run_url)$repeat_note

**Feedback for the coder**

Failed jobs: $(tr '\n' ' ' <<<"$failed")

${failing_tests:+Failing tests:
$failing_tests
}
<details><summary>Last log lines</summary>

\`\`\`
$log_tail
\`\`\`
</details>
<!-- ci-sig:$sig -->
<!-- feedback -->"
set_stage "$n" code
dispatch coder.yml "$PIPELINE_REF" "$n" "issue=$n" "round=$next"
