#!/usr/bin/env bash
# After a merge: wait for Vercel to deploy that commit, run the smoke tests against it, and
# revert the merge automatically if either fails.
# Env: SHA, ISSUE (may be empty), MODE (task|revert), STAGING_URL (repo variable, optional)
source "$(dirname "$0")/lib.sh"
sha=${SHA:?} n=${ISSUE:-} mode=${MODE:-task}
run_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID"

# 1. Wait up to 15 minutes for Vercel's deployment of this commit. Vercel reports it either as a GitHub
# Deployment or, for this repository, only as a "Vercel" commit status on the commit; accept either.
state="" url=""
for _ in $(seq 1 45); do
  dep=$(gh api "repos/$GH_REPO/deployments?sha=$sha&per_page=30" \
        --jq '[.[] | select(.environment | test("production|staging"; "i"))][0].id // empty')
  if [[ -n $dep ]]; then
    read -r state url < <(gh api "repos/$GH_REPO/deployments/$dep/statuses?per_page=1" \
      --jq '.[0] | "\(.state // "pending") \(.environment_url // "")"')
  else
    state=$(gh api "repos/$GH_REPO/commits/$sha/statuses?per_page=100" \
      --jq '[.[] | select(.context | test("^vercel"; "i"))][0].state // empty')
  fi
  if [[ $state =~ ^(success|failure|error)$ ]]; then break; fi
  sleep 20
done
[[ $state =~ ^(success|failure|error)$ ]] || state=""  # still pending after 15 minutes counts as not found
echo "Deployment state: ${state:-not found} ${url}"

fail() { # reason [log]
  if [[ $mode == revert ]]; then
    alert "Staging still fails after the automatic revert of task #$n: $1. Main needs a human. [Run]($run_url)"
    exit 1
  fi
  # Open a revert PR. CI and a mechanical check run on it, then it merges and staging is checked again.
  local short=${sha:0:7} pr_url
  git_push_setup "pipeline-bot"
  git fetch -q origin main
  git checkout -q -B "revert/$short" origin/main
  # Tells the dispatcher a retry of this task must start again rather than just re-check staging.
  comment "$n" "↩️ Reverting ${short} because it failed on staging. <!-- reverted:$sha -->"
  if ! git revert --no-edit "$sha"; then
    stall "$n" "failed on staging ($1) and the automatic revert of ${short} hit a conflict. Please revert it by hand." "${2:-}"
    exit 1
  fi
  git push -q -f origin "revert/$short"
  pr_url=$(gh pr create --base main --head "revert/$short" \
    --title "Revert task #$n (${short}): failed on staging" \
    --body "Automatic revert: $1. [Run]($run_url)
<!-- revert-of:$sha -->")
  stall "$n" "merged as ${short} but failed on staging ($1). Revert PR #${pr_url##*/} is on its way in." "${2:-}"
  gh workflow run ci.yml --ref main -f "branch=revert/$short" -f "issue=$n"
  exit 1
}

if [[ -z $state ]]; then
  # No deploy appeared. That's an infrastructure problem, not necessarily this change, so flag it without reverting.
  if [[ -n $n && $mode == task ]]; then
    stall "$n" "no Vercel deployment of ${sha:0:7} showed up within 15 minutes. Check the Vercel dashboard. [Run]($run_url)"
  else
    alert "No Vercel deployment of ${sha:0:7} showed up within 15 minutes. [Run]($run_url)"
  fi
  exit 1
fi
if [[ $state != success ]]; then fail "the Vercel build of ${sha:0:7} ended in '$state'"; fi

target=${STAGING_URL:-$url}
echo "Smoke-testing $target"
smoke() { STAGING_URL=$target npx playwright test --project=smoke > "$RUNNER_TEMP/smoke.log" 2>&1; }
# A failure here reverts the task and pays to build it again, so give a slow or still-switching deployment
# one more chance a minute later first.
if ! smoke && { cat "$RUNNER_TEMP/smoke.log"; echo "Smoke tests failed; trying once more in 60 seconds."; sleep 60; ! smoke; }; then
  cat "$RUNNER_TEMP/smoke.log"
  fail "the smoke tests failed on $target" "$(tail -40 "$RUNNER_TEMP/smoke.log" | sed 's/```/` ` `/g')"
fi
cat "$RUNNER_TEMP/smoke.log"

if [[ $mode == revert ]]; then
  alert "Staging is healthy again after the revert. Task #$n stays stalled until you re-queue it."
  dispatch dispatcher.yml main ""
  exit 0
fi
if [[ -n $n ]]; then
  remove_labels "$n" in-progress stalled "stage:staging"
  add_labels "$n" done
  gh issue close "$n" --comment "🚀 Live on staging ($target) and the smoke tests passed. Task done. Total spend: \$$(task_cost "$n")." >/dev/null
  left=$(for l in queued in-progress stalled; do gh issue list --label "$l" --state open --json number -q '.[].number'; done)
  if [[ -z $left ]]; then
    alert "🎉 Task #$n was the last one: every planned task is done and live on staging ($target). This month's AI spend so far: \$$(month_spend)."
  fi
fi
dispatch dispatcher.yml main ""
