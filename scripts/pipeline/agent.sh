#!/usr/bin/env bash
# Runs before and after each agent step.
#   agent.sh <tests|code|review> prepare
#   agent.sh <tests|code|review> finish <execution-file>
# Inputs come from the environment: ISSUE, ROUND (code), PR (review).
# prepare writes .pipeline/ (the agent's context) and sets step outputs skip, model, max_turns.
# finish keeps only the files that agent may change, commits, records cost and starts the next stage.
source "$(dirname "$0")/lib.sh"
role=$1 phase=$2 exec_file=${3:-}
n=${ISSUE:?ISSUE must be set}
mkdir -p .pipeline
run_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"

out() { echo "$1" >> "$GITHUB_OUTPUT"; }
skip() { out "skip=true"; exit 0; }

role_key() { case $1 in tests) echo adversary_tests ;; review) echo adversary_review ;; code) echo coder ;; esac; }

write_task() {
  gh issue view "$n" --json number,title,body -q '"# Task #\(.number): \(.title)\n\n\(.body)"' > .pipeline/task.md
}

# File contents that are safe to paste into a comment.
clip() { sed 's/```/` ` `/g' "$1" | head -c 6000; }

if [[ $phase == prepare ]]; then
  if labels_of "$n" | grep -qx stalled; then log "task is stalled"; skip; fi
  if over_budget "$n"; then
    stall "$n" "spent \$$(task_cost "$n") of the \$$(cfg .limits.per_task_usd) per-task budget"
    skip
  fi
  write_task
  key=$(role_key "$role")
  case $role in
    tests)
      cp "$KIT/prompts/adversary-tests.md" .pipeline/instructions.md
      ;;
    code)
      r=${ROUND:-1}
      max=$(cfg .limits.max_rounds)
      if (( r > max + 1 )); then
        stall "$n" "no approval after $max rounds and one escalation round"
        skip
      elif (( r == max + 1 )); then
        key=coder_escalation
      fi
      cp "$KIT/prompts/coder.md" .pipeline/instructions.md
      fb=$(last_body_with "$n" "<!-- feedback -->")
      if [[ -n $fb ]]; then printf '%s\n' "$fb" > .pipeline/feedback.md; fi
      ;;
    review)
      cp "$KIT/prompts/adversary-review.md" .pipeline/instructions.md
      git fetch -q origin main
      git diff "$(git merge-base origin/main HEAD)" HEAD > .pipeline/diff.patch
      ;;
  esac
  out "skip=false"
  out "role_key=$key"
  out "model=$(cfg ".roles.$key.model")"
  out "max_turns=$(cfg ".roles.$key.max_turns")"
  exit 0
fi

# ---- finish ----
cost=$(run_cost "$exec_file")
model=${MODEL:-$(cfg ".roles.$(role_key "$role").model")}
git_push_setup "$role-bot"
branch=$(git rev-parse --abbrev-ref HEAD)
PROTECTED='^(\.github/|scripts/|prompts/|spec/|tests/|models\.yaml$|playwright\.config\.ts$|vitest\.config\.ts$|\.pipeline/)'

case $role in
  tests)
    keep_only '^tests/' ''
    if git diff --cached --quiet; then
      comment "$n" "Adversary run wrote no tests. <!-- cost:$cost -->"
      stall "$n" "the adversary did not write any tests"
      exit 0
    fi
    git commit -q -m "test: acceptance tests for #$n (adversary)"
    git push -q origin "HEAD:$branch"
    questions="None."
    if [[ -f .pipeline/questions.md ]]; then questions=$(clip .pipeline/questions.md); fi
    comment "$n" "🧪 **Adversary wrote the tests** ($model, \$$cost). [Run]($run_url)

$(git show --stat --format= HEAD | sed 's/^/    /')

**Assumptions where the criteria were unclear:**
$questions
<!-- cost:$cost -->
<!-- tests-lock:$(tests_lock) -->"
    set_stage "$n" code
    dispatch coder.yml main "$n" "issue=$n" "round=1"
    ;;

  code)
    r=${ROUND:-1}
    keep_only '.' "$PROTECTED"
    dropped=$(cat .pipeline/dropped.txt)
    if git diff --cached --quiet; then
      comment "$n" "Coder round $r made no changes. <!-- cost:$cost --> <!-- coder-round:$r -->"
      stall "$n" "the coder made no changes in round $r"
      exit 0
    fi
    git commit -q -m "feat: #$n round $r ($model)"
    git push -q origin "HEAD:$branch"
    notes="_No notes._"
    if [[ -f .pipeline/coder-notes.md ]]; then notes=$(clip .pipeline/coder-notes.md); fi
    pr=$(pr_for_branch "$branch")
    if [[ -z $pr ]]; then
      title=$(gh issue view "$n" --json title -q .title)
      url=$(gh pr create --base main --head "$branch" --title "Task #$n: $title" \
        --body "Implements #$n. Built by the coder agent, tested by the adversary, and merged automatically once every check passes and staging is next in line.")
      pr=${url##*/}
    fi
    body="**Coder round $r** ($model, \$$cost). [Run]($run_url)

$notes"
    if [[ -n $dropped ]]; then
      body+=$'\n\nChanges thrown away because the coder may not touch these files:\n```\n'"$dropped"$'\n```'
    fi
    comment "$pr" "$body"
    comment "$n" "🔨 Coder round $r pushed to #$pr ($model, \$$cost). <!-- cost:$cost --> <!-- coder-round:$r -->"
    set_stage "$n" ci
    dispatch ci.yml "$branch" "$n" "issue=$n"
    ;;

  review)
    pr=${PR:?PR must be set}
    sha_reviewed=$(git rev-parse HEAD)
    keep_only '^tests/' ''
    added_tests=false
    if ! git diff --cached --quiet; then
      git commit -q -m "test: regression tests for #$n from review (adversary)"
      git push -q origin "HEAD:$branch"
      added_tests=true
    fi
    verdict=$(jq -r '.verdict // empty' .pipeline/verdict.json 2>/dev/null || true)
    summary=$(jq -r '.summary // empty' .pipeline/verdict.json 2>/dev/null || true)
    findings=$(jq -r '.findings[]? | "- **\(.severity)**: \(.detail)"' .pipeline/verdict.json 2>/dev/null || true)
    if [[ ! $verdict =~ ^(approve|request_changes|escalate)$ ]]; then
      verdict=request_changes
      summary="The reviewer did not leave a valid verdict, so this round counts as changes requested."
    fi
    if [[ $added_tests == true && $verdict == approve ]]; then
      verdict=request_changes
      summary+=" The reviewer added new tests, so the coder must make them pass before this can merge."
    fi
    body="**Adversary verdict: \`$verdict\`** ($model, \$$cost). [Run]($run_url)

$summary"
    if [[ -n $findings ]]; then body+=$'\n\n'"$findings"; fi
    if [[ $added_tests == true ]]; then
      body+=$'\n\nNew tests added:\n'"$(git show --stat --format= HEAD | sed 's/^/    /')"
    fi
    comment "$pr" "$body"
    lock=""
    if [[ $added_tests == true ]]; then lock="<!-- tests-lock:$(tests_lock) -->"; fi
    comment "$n" "🔍 Review of #$pr: \`$verdict\` (\$$cost).
<!-- cost:$cost -->
$lock"
    if [[ $verdict != approve ]]; then
      comment "$n" "**Feedback for the coder** (adversary review of ${sha_reviewed:0:7}):

$summary

$findings
<!-- feedback -->"
    fi
    out "verdict=$verdict"
    out "reason=$summary"
    ;;
esac
