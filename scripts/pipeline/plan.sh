#!/usr/bin/env bash
# Runs before and after the planner agent.  plan.sh prepare | plan.sh publish <execution-file>
#
# Each plan is saved as a comment on the "Planner output" issue, keyed by a fingerprint of spec/ and the
# planner prompt. If a run fails after planning, the next run reuses the saved plan instead of paying
# for the planner again, and a spec that has already been turned into tasks is never planned twice.
source "$(dirname "$0")/lib.sh"
mkdir -p .pipeline

out() { echo "$1" >> "$GITHUB_OUTPUT"; }

spec_hash() { cat $(find spec -type f | sort) "$KIT/prompts/planner.md" | sha256sum | cut -c1-16; }

plans_issue() {
  local n
  n=$(gh issue list --label plans --state all --json number -q '.[0].number // empty')
  if [[ -z $n ]]; then
    gh label create plans --force --color ededed >/dev/null 2>&1 || true
    n=$(gh issue create --title "Planner output" --label plans \
      --body "The planner saves each plan here so a failed run can be finished without planning again. No action needed." |
      grep -oE '[0-9]+$')
    gh issue close "$n" >/dev/null
  fi
  echo "$n"
}

case "$1" in
  prepare)
    if ! grep -qE '^status:[[:space:]]*ready[[:space:]]*$' spec/app.md; then
      log "spec/app.md is not marked 'status: ready'; nothing to plan"
      out "skip=true"; exit 0
    fi
    if paused; then log "paused"; out "skip=true"; exit 0; fi
    ensure_labels
    hash=$(spec_hash)
    store=$(plans_issue)
    out "hash=$hash"
    if markers "$store" published | grep -qx "$hash"; then
      log "this version of the spec ($hash) has already been turned into tasks"
      out "skip=true"; exit 0
    fi
    saved=$(last_marker "$store" "plan-$hash")
    if [[ -n $saved ]]; then
      base64 -d <<<"$saved" > .pipeline/plan.json
      log "reusing the saved plan for spec $hash; the planner agent will not run"
      out "skip=false"; out "reuse=true"; exit 0
    fi
    # gh treats several labels as AND, so collect each label on its own and merge.
    for l in queued in-progress stalled done task; do
      gh issue list --state all --label "$l" --limit 300 --json number,title,state,body
    done | jq -s 'add | unique_by(.number)' > .pipeline/existing-issues.json
    cp "$KIT/prompts/planner.md" .pipeline/instructions.md
    out "skip=false"
    out "reuse=false"
    out "model=$(cfg .roles.planner.model)"
    out "max_turns=$(cfg .roles.planner.max_turns)"
    ;;

  publish)
    hash=${HASH:?HASH must be set}
    store=$(plans_issue)
    cost=$(run_cost "${2:-}")
    if ! jq -e '.tasks | type == "array"' .pipeline/plan.json >/dev/null 2>&1; then
      alert "The planner ran but did not produce a valid plan (cost \$$cost). See run $GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"
      exit 1
    fi
    if [[ ${REUSE:-false} != true ]]; then
      # Save the plan before creating anything, so a failure below never means paying to plan again.
      saved=$(jq -c . .pipeline/plan.json | base64 -w0)
      if (( ${#saved} < 60000 )); then
        comment "$store" "Plan for spec \`$hash\` ($(jq '.tasks | length' .pipeline/plan.json) tasks, \$$cost), from run $GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID
<!-- cost:$cost -->
<!-- plan-$hash:$saved -->"
      fi
    fi
    created=()
    count=$(jq '.tasks | length' .pipeline/plan.json)
    for i in $(seq 0 $((count - 1))); do
      title=$(jq -r --argjson i "$i" '.tasks[$i].title' .pipeline/plan.json)
      body=$(jq -r --argjson i "$i" --arg sha "$GITHUB_SHA" --arg hash "$hash" \
        '.tasks[$i] | (if (.story // "") != "" then "**\(.story)**\n\n" else "" end)
          + "\(.body)\n\n---\n_Planned from spec \($hash) at commit \($sha)._"' .pipeline/plan.json)
      url=$(gh issue create --title "$title" --body "$body" --label queued)
      created+=("#${url##*/}")
    done
    comment "$store" "Tasks created for spec \`$hash\`: ${created[*]:-none}
<!-- published:$hash -->"
    assumptions=$(jq -r '.assumptions[]? | "- " + .' .pipeline/plan.json)
    if ((${#created[@]})); then
      alert "Planner created ${#created[@]} task(s): ${created[*]} (cost \$$cost).${assumptions:+

Assumptions it made where the spec was unclear:
$assumptions}"
      dispatch dispatcher.yml main ""
    else
      log "planner found nothing new to do"
    fi
    ;;
esac
