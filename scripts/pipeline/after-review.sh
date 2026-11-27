#!/usr/bin/env bash
# Runs after the adversary's verdict on an agent branch.
#   approve         -> merge the PR (GitHub refuses if any required check is not green) and start staging
#   request_changes -> next coder round with the review as feedback
#   escalate        -> stall: the spec or task needs a human decision
# Env: ISSUE, PR, BRANCH, VERDICT, REASON, JOB_RESULT
source "$(dirname "$0")/lib.sh"
n=${ISSUE:-} pr=${PR:?} branch=${BRANCH:?} verdict=${VERDICT:-}
run_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"

# merge runs inside $(...), a subshell, so its error goes through a file to reach the stall message.
merge_error="" merge_log="$RUNNER_TEMP/merge-error.txt"
# GitHub sometimes refuses a merge for a few seconds after the statuses are posted or main moves ("base
# branch was modified", checks not registered yet), so try three times before giving up.
merge() {
  local sha try
  for try in 1 2 3; do
    sha=$(gh pr view "$pr" --json headRefOid -q .headRefOid)
    if gh pr merge "$pr" --squash --delete-branch --match-head-commit "$sha" >"$merge_log" 2>&1; then break; fi
    cat "$merge_log" >&2
    if grep -qiE 'conflict|not mergeable' "$merge_log" || (( try == 3 )); then return 1; fi
    sleep 20
  done
  sleep 5
  gh pr view "$pr" --json mergeCommit -q .mergeCommit.oid
}

# If main moved on while this task ran (for example your own PR merged), the PR can conflict with main.
# Merge main into the task branch (CHANGELOG.md lines from both sides are kept, see .gitattributes) and
# send it round CI and review again. Only once per attempt, and only when git can merge cleanly.
catch_up_with_main() {
  local state
  state=$(gh api "repos/$GH_REPO/pulls/$pr" --jq .mergeable_state)
  # GitHub works the state out lazily, so the first answer can be "unknown".
  if [[ $state == unknown ]]; then sleep 10; state=$(gh api "repos/$GH_REPO/pulls/$pr" --jq .mergeable_state); fi
  [[ $state =~ ^(dirty|behind)$ ]] || return 1
  [[ -z $(markers "$n" caught-up) ]] || return 1
  git_push_setup "pipeline-bot"
  git fetch -q origin main "$branch"
  git checkout -q -B catch-up "origin/$branch"
  if ! git merge -q --no-edit origin/main; then
    git merge --abort || true
    merge_error="it conflicts with main in a way git can't resolve on its own"
    return 1
  fi
  git push -q origin "HEAD:$branch"
}

# Report the verdict as a commit status on the commit the adversary reviewed (see report_status in lib.sh).
if [[ -n $verdict ]]; then
  [[ $verdict == approve ]] && st=success || st=failure
  report_status "${SHA:-$GITHUB_SHA}" adversary-verdict "$st" "$verdict"
  sleep 3
fi

if [[ $branch == revert/* ]]; then
  if [[ $verdict == approve ]] && sha=$(merge); then
    alert "↩️ Reverted: PR #$pr undid a change that failed on staging (task #$n). Checking staging again."
    dispatch staging.yml main "" "sha=$sha" "issue=$n" "mode=revert"
  else
    alert "The automatic revert PR #$pr could not be merged. Main may be broken; please look. [Run]($run_url)"
  fi
  exit 0
fi

if [[ -z $verdict ]]; then
  # The review was skipped (task stalled or over budget) or crashed before writing a verdict.
  if labels_of "$n" | grep -qx stalled; then exit 0; fi
  stall "$n" "the adversary review did not finish (job result: ${JOB_RESULT:-unknown}). [Run]($run_url)"
  exit 0
fi

case $verdict in
  approve)
    if sha=$(merge); then
      comment "$n" "🔀 Merged #$pr as ${sha:0:7}. Next: deploy to staging and run the smoke tests.
<!-- merged:$sha -->"
      set_stage "$n" staging
      dispatch staging.yml main "$n" "sha=$sha" "issue=$n" "mode=task"
    elif merge_error=$(head -1 "$merge_log" 2>/dev/null); catch_up_with_main; then
      comment "$n" "🔄 Main moved while #$pr was in progress. Merged main into \`$branch\`; CI and review run again on the result.
<!-- caught-up:1 -->"
      set_stage "$n" ci
      dispatch ci.yml "$branch" "$n" "issue=$n"
    else
      stall "$n" "the adversary approved #$pr but GitHub refused the merge: ${merge_error:-unknown reason}. [Run]($run_url)"
    fi
    ;;
  escalate)
    stall "$n" "the adversary escalated #$pr for a human decision: ${REASON:-see the PR}"
    ;;
  *)
    r=$(last_round "$n"); r=${r:-1}
    set_stage "$n" code
    dispatch coder.yml main "$n" "issue=$n" "round=$((r + 1))"
    ;;
esac
