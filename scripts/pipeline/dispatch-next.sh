#!/usr/bin/env bash
# Starts the oldest queued task, but only when nothing else is running. Tasks run one at a time, in order.
source "$(dirname "$0")/lib.sh"
ensure_labels

if paused; then log "paused"; exit 0; fi

busy=$(gh issue list --label in-progress --state open --json number -q '.[0].number // empty')
if [[ -n $busy ]]; then log "task #$busy is still in progress"; exit 0; fi
revert=$(gh pr list --state open --json number,headRefName -q '[.[] | select(.headRefName | startswith("revert/"))][0].number // empty')
if [[ -n $revert ]]; then log "revert PR #$revert is still open"; exit 0; fi

n=$(gh issue list --label queued --state open --limit 300 --json number -q 'sort_by(.number) | .[0].number // empty')
if [[ -z $n ]]; then log "no queued tasks"; exit 0; fi

remove_labels "$n" queued stalled done
add_labels "$n" in-progress

# Start the attempt clean: close any PR left over from an earlier attempt and reset the branch to main.
for pr in $(gh pr list --head "task/$n" --state open --json number -q '.[].number'); do
  gh pr close "$pr" --comment "Closed: task #$n is starting over from main." >/dev/null
done
git_push_setup "pipeline-bot"
git push -f origin "HEAD:refs/heads/task/$n"

comment "$n" "▶️ Started on branch \`task/$n\`. Next: the adversary writes failing tests from the acceptance criteria.
<!-- attempt-start -->"
set_stage "$n" tests
dispatch adversary-tests.yml main "$n" "issue=$n"
