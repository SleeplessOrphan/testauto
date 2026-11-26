#!/usr/bin/env bash
# Runs before and after the planner agent.  plan.sh prepare | plan.sh publish <execution-file>
source "$(dirname "$0")/lib.sh"
mkdir -p .pipeline

case "$1" in
  prepare)
    if ! grep -qE '^status:[[:space:]]*ready[[:space:]]*$' spec/app.md; then
      log "spec/app.md is not marked 'status: ready'; nothing to plan"
      echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0
    fi
    if paused; then log "paused"; echo "skip=true" >> "$GITHUB_OUTPUT"; exit 0; fi
    ensure_labels
    # gh treats several labels as AND, so collect each label on its own and merge.
    for l in queued in-progress stalled done task; do
      gh issue list --state all --label "$l" --limit 300 --json number,title,state,body
    done | jq -s 'add | unique_by(.number)' > .pipeline/existing-issues.json
    cp "$KIT/prompts/planner.md" .pipeline/instructions.md
    {
      echo "skip=false"
      echo "model=$(cfg .roles.planner.model)"
      echo "max_turns=$(cfg .roles.planner.max_turns)"
    } >> "$GITHUB_OUTPUT"
    ;;
  publish)
    cost=$(run_cost "${2:-}")
    if ! jq -e '.tasks | type == "array"' .pipeline/plan.json >/dev/null 2>&1; then
      alert "The planner ran but did not produce a valid plan (cost \$$cost). See run $GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"
      exit 1
    fi
    created=()
    count=$(jq '.tasks | length' .pipeline/plan.json)
    for i in $(seq 0 $((count - 1))); do
      title=$(jq -r ".tasks[$i].title" .pipeline/plan.json)
      body=$(jq -r ".tasks[$i] | \"**\(.story // "")**\n\n\(.body)\n\n---\n_Planned from spec at commit ${GITHUB_SHA}._\"" .pipeline/plan.json)
      url=$(gh issue create --title "$title" --body "$body" --label queued)
      created+=("#${url##*/}")
    done
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
