#!/usr/bin/env bash
# Runs after the adversary's verdict on an agent branch.
#   approve         -> merge the PR (GitHub refuses if any required check is not green) and start staging
#   request_changes -> next coder round with the review as feedback
#   escalate        -> stall: the spec or task needs a human decision
# Env: ISSUE, PR, BRANCH, VERDICT, REASON, JOB_RESULT
source "$(dirname "$0")/lib.sh"
n=${ISSUE:-} pr=${PR:?} branch=${BRANCH:?} verdict=${VERDICT:-}
run_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"

merge() {
  local sha
  sha=$(gh pr view "$pr" --json headRefOid -q .headRefOid)
  if ! out=$(gh pr merge "$pr" --squash --delete-branch --match-head-commit "$sha" 2>&1); then
    return 1
  fi
  sleep 5
  gh pr view "$pr" --json mergeCommit -q .mergeCommit.oid
}

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
      comment "$n" "🔀 Merged #$pr as ${sha:0:7}. Next: deploy to staging and run the smoke tests."
      set_stage "$n" staging
      dispatch staging.yml main "$n" "sha=$sha" "issue=$n" "mode=task"
    else
      stall "$n" "the adversary approved #$pr but GitHub refused the merge (a required check is missing or red, or main moved). [Run]($run_url)"
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
