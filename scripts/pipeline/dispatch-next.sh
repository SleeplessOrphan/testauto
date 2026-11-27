#!/usr/bin/env bash
# Starts the oldest queued task, but only when nothing else is running and no task is stalled. Tasks run one
# at a time, strictly in order.
source "$(dirname "$0")/lib.sh"
ensure_labels

if paused; then log "paused"; exit 0; fi

busy=$(gh issue list --label in-progress --state open --json number -q '.[0].number // empty')
if [[ -n $busy ]]; then log "task #$busy is still in progress"; exit 0; fi
revert=$(gh pr list --state open --json number,headRefName -q '[.[] | select(.headRefName | startswith("revert/"))][0].number // empty')
if [[ -n $revert ]]; then log "revert PR #$revert is still open"; exit 0; fi

# Strictly in order: while any task is stalled, nothing new starts, so later tasks never build on top of
# a task that hasn't merged. Retrying the stalled task (or closing it) lets the queue carry on.
stuck=$(gh issue list --label stalled --state open --json number -q 'sort_by(.number) | .[0].number // empty')
if [[ -n $stuck ]]; then log "task #$stuck is stalled; the queue waits for it"; exit 0; fi

n=$(gh issue list --label queued --state open --limit 300 --json number -q 'sort_by(.number) | .[0].number // empty')
if [[ -z $n ]]; then log "no queued tasks"; exit 0; fi

# Resume where the last attempt stopped instead of paying for the AI stages again, unless the issue has the
# `restart` label. Tests exist (a test lock was recorded) and the branch is still there:
#   with an open PR  -> run CI on it again (free); the review reuses an approval if the changes are unchanged
#   without a PR     -> next coder round
restart=false
if labels_of "$n" | grep -qx restart; then restart=true; fi
remove_labels "$n" queued stalled done restart
add_labels "$n" in-progress

lock=$(last_marker "$n" tests-lock)
if [[ $restart == false && -n $lock ]] && gh api "repos/$GH_REPO/branches/task/$n" >/dev/null 2>&1; then
  pr=$(pr_for_branch "task/$n")
  r=$(last_round "$n"); r=${r:-0}
  # resume-round resets the round limit and budget for this try (see resume_base in lib.sh).
  if [[ -n $pr ]]; then
    comment "$n" "⏯️ Resumed with the existing tests and code in #$pr. Next: CI runs again; the adversary's approval is reused if the code hasn't changed. <!-- resume-round:$r -->"
    set_stage "$n" ci
    dispatch ci.yml "task/$n" "$n" "issue=$n"
  else
    comment "$n" "⏯️ Resumed with the adversary's existing tests. Next: coder round $((r + 1)). <!-- resume-round:$r -->"
    set_stage "$n" code
    dispatch coder.yml main "$n" "issue=$n" "round=$((r + 1))"
  fi
  exit 0
fi

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
