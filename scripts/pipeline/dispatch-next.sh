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
# A stalled task that already has `queued` again is being retried, so it doesn't block (whichever order the
# two labels were changed in).
stuck=$(gh issue list --label stalled --state open --json number,labels \
  -q '[.[] | select([.labels[].name] | index("queued") | not)] | sort_by(.number) | .[0].number // empty')
if [[ -n $stuck ]]; then log "task #$stuck is stalled; the queue waits for it"; exit 0; fi

# Monthly AI budget: once this month's recorded spend reaches limits.monthly_usd, open a pause issue
# (the normal kill switch) and stop. Closing that issue means "carry on anyway this month".
month=$(date -u +%Y-%m)
spent=$(month_spend)
cap=$(cfg '.limits.monthly_usd // 0')
if awk -v s="$spent" -v c="$cap" 'BEGIN {exit !(c > 0 && s >= c)}'; then
  pauses=$(gh issue list --label pause --state all --limit 100 --json body -q '.[].body')
  if ! grep -qF "<!-- budget-month:$month -->" <<<"$pauses"; then
    gh issue create --title "Paused: monthly AI budget reached" --label pause \
      --body "This month's recorded AI spend is \$$spent, which reached the \$$cap monthly limit in models.yaml. No new task starts while this issue is open. Close it to carry on anyway this month.
<!-- budget-month:$month -->" >/dev/null
    alert "Paused: this month's AI spend is \$$spent (limit \$$cap). Close the pause issue to carry on anyway."
    exit 0
  fi
fi

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

# Already merged but staging didn't confirm it (for example Vercel never reported a deploy): the code is on
# main, so redoing the task would find nothing to change. Check staging again instead.
merged=$(last_marker "$n" merged)
if [[ $restart == false && -n $merged && $merged != "$(last_marker "$n" reverted)" ]]; then
  comment "$n" "⏯️ Resumed: ${merged:0:7} is already merged, so only the staging check runs again. <!-- resume-round:$(last_round "$n") -->"
  set_stage "$n" staging
  dispatch staging.yml main "$n" "sha=$merged" "issue=$n" "mode=task"
  exit 0
fi

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
