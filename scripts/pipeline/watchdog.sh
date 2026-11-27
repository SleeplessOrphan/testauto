#!/usr/bin/env bash
# Runs every hour. For each running task:
#   - if a workflow for it is still going, that is its heartbeat (each job's timeout-minutes kills hung runs)
#   - if the workflow for its current stage failed or was cancelled and nothing moved on, stall it now
#   - if it has sat in one stage longer than stage_minutes in models.yaml with nothing running, stall it
# Stalling labels the issue `stalled`, posts the reason and last log lines, and notifies you on the alerts issue.
# Also restarts the queue if work is waiting and nothing is running.
source "$(dirname "$0")/lib.sh"
ensure_labels
if paused; then log "paused: watchdog idle"; exit 0; fi

declare -A STAGE_WORKFLOW=([tests]=adversary-tests [code]=coder [ci]=ci [review]=adversary-review [staging]=staging)
now=$(date +%s)
runs=$(gh run list --limit 100 --json databaseId,displayTitle,workflowName,status,conclusion,createdAt,updatedAt)

for n in $(gh issue list --label in-progress --state open --json number -q '.[].number'); do
  stage=$(current_stage "$n")
  if [[ -z $stage ]]; then stall "$n" "it is marked in-progress but has no stage label"; continue; fi
  since=$(gh api "repos/$GH_REPO/issues/$n/events" --paginate \
    --jq '.[] | select(.event == "labeled" and (.label.name | startswith("stage:"))) | .created_at' | tail -1)
  age=$(( (now - $(date -d "${since:-@$now}" +%s)) / 60 ))
  limit=$(cfg ".stage_minutes.$stage")
  mine=$(jq --arg n "$n" '[.[] | select(.displayTitle | test("(#|task/)" + $n + "($|[^0-9])"))]' <<<"$runs")
  active=$(jq '[.[] | select(.status != "completed")] | length' <<<"$mine")
  echo "#$n stage=$stage age=${age}m limit=${limit}m active_runs=$active"
  if (( active > 0 )); then continue; fi

  wf=${STAGE_WORKFLOW[$stage]}
  broken=$(jq -r --arg wf "$wf" --arg since "$since" '
    [.[] | select(.workflowName == $wf and .status == "completed"
                  and (.conclusion | IN("failure", "cancelled", "timed_out", "startup_failure"))
                  and .createdAt >= $since)] | .[0].databaseId // empty' <<<"$mine")
  if [[ -n $broken ]]; then
    tail=$(gh run view "$broken" --log-failed 2>/dev/null | tail -40 | cut -c1-300 | sed 's/```/` ` `/g' || true)
    stall "$n" "the $wf run for stage '$stage' ended badly and nothing picked the task up ($GITHUB_SERVER_URL/$GH_REPO/actions/runs/$broken)" "$tail"
    continue
  fi
  if (( age > limit )); then
    stall "$n" "no progress in stage '$stage' for $age minutes (limit $limit) and no workflow is running for it"
  fi
done

# Nothing running but work queued: kick the dispatcher (it no-ops if a task or revert is in flight).
if [[ -z $(gh issue list --label in-progress --state open --json number -q '.[0].number // empty') &&
      -n $(gh issue list --label queued --state open --json number -q '.[0].number // empty') ]]; then
  dispatch dispatcher.yml "$PIPELINE_REF" ""
fi
