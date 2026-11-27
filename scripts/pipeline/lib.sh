#!/usr/bin/env bash
# Shared helpers for the pipeline. Every pipeline script sources this file.
# Needs: GH_TOKEN and GH_REPO in the environment, plus gh, jq and yq (all on GitHub's ubuntu runners).
set -euo pipefail

: "${GH_REPO:?GH_REPO must be set}"
OWNER="${GH_REPO%%/*}"
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # folder that holds scripts/, prompts/, models.yaml
CFG="$KIT/models.yaml"
BOT="github-actions[bot]"
STAGES=(tests code ci review staging)

cfg() { yq -r "$1" "$CFG"; }

log() { echo "::notice::$*"; }

label_color() {
  case "$1" in
    stalled|alerts) echo d73a4a ;; pause) echo fbca04 ;; done) echo 0e8a16 ;;
    in-progress) echo 1d76db ;; queued|task) echo c5def5 ;; *) echo ededed ;;
  esac
}

ensure_labels() {
  local l
  for l in task queued in-progress stalled done pause alerts stage:tests stage:code stage:ci stage:review stage:staging; do
    gh label create "$l" --force --color "$(label_color "$l")" >/dev/null 2>&1 || true
  done
}

labels_of() { gh issue view "$1" --json labels -q '.labels[].name'; }

remove_labels() { # issue label...
  local n=$1 cur l; shift
  cur=$(labels_of "$n")
  for l in "$@"; do
    if grep -qxF "$l" <<<"$cur"; then gh issue edit "$n" --remove-label "$l" >/dev/null; fi
  done
}

add_labels() { local n=$1 l; shift; for l in "$@"; do gh issue edit "$n" --add-label "$l" >/dev/null; done; }

# Files no agent may change: the pipeline itself, the spec, and every config that decides what the
# type check, build and test runs cover (so the coder can't weaken a check instead of fixing the code).
PROTECTED_RE='^(\.github/|scripts/|prompts/|spec/|models\.yaml$|playwright\.config\.ts$|vitest\.config\.ts$|tsconfig[^/]*\.json$|next\.config\.[a-z]+$|vercel\.json$|\.gitattributes$)'

set_stage() { # issue stage
  local n=$1 s=$2 rm=() x
  for x in "${STAGES[@]}"; do [[ $x == "$s" ]] || rm+=("stage:$x"); done
  remove_labels "$n" "${rm[@]}"
  add_labels "$n" "stage:$s"
}

current_stage() { labels_of "$1" | grep -oP '^stage:\K.*' | head -1 || true; }

comment() { gh issue comment "$1" --body "$2" >/dev/null; }   # works on PRs too

# Bot comments on an issue since the current attempt started, as a JSON array of {id, body}.
bot_comments() {
  gh api "repos/$GH_REPO/issues/$1/comments" --paginate \
    --jq ".[] | select(.user.login==\"$BOT\") | {id, body}" |
  jq -s '. as $all
    | ([range(0; length) | select($all[.].body | contains("<!-- attempt-start -->"))] | last // 0) as $i
    | $all[$i:]'
}

# Values of <!-- name:VALUE --> markers in this attempt's bot comments, oldest first.
markers() { bot_comments "$1" | jq -r '.[].body' | grep -oP "<!-- $2:\K[^ ]+(?= -->)" || true; }

last_marker() { markers "$1" "$2" | tail -1; }

# Body of the newest bot comment in this attempt that contains the given text.
last_body_with() { bot_comments "$1" | jq -r --arg m "$2" '[.[] | select(.body | contains($m))] | last | .body // empty'; }

task_cost() { markers "$1" cost | awk '{s+=$1} END {printf "%.2f", s+0}'; }

over_budget() { awk -v c="$(task_cost "$1")" -v cap="$(cfg .limits.per_task_usd)" 'BEGIN {exit !(c >= cap)}'; }

last_round() { last_marker "$1" coder-round || true; }

# Cost of one claude-code-action run, read from its execution file.
run_cost() {
  local f=${1:-}
  [[ -n $f && -f $f ]] || { echo 0; return; }
  jq -r '[.[]? | select(.type=="result") | .total_cost_usd // 0] | last // 0' "$f" 2>/dev/null || echo 0
}

paused() { [[ -n $(gh issue list --label pause --state open --json number -q '.[0].number // empty') ]]; }

# GitHub doesn't count check runs from workflow_dispatch runs towards a PR's required checks (the merge box
# shows them as "Expected - Waiting for status"). So the pipeline also reports each result as a commit
# status with the same name, which does count. Usage: report_status <sha> <context> <success|failure> [description]
report_status() {
  local sha=$1 ctx=$2 state=$3 desc=${4:-}
  gh api -X POST "repos/$GH_REPO/statuses/$sha" -f state="$state" -f context="$ctx" \
    -f target_url="$GITHUB_SERVER_URL/$GH_REPO/actions/runs/$GITHUB_RUN_ID" -f description="${desc:0:140}" >/dev/null \
    || echo "::warning::could not report status $ctx on ${sha:0:7}"
}

alerts_issue() {
  local n
  # Open one first; else reuse a closed one (comments on it still email you) instead of making a duplicate.
  n=$(gh issue list --label alerts --state open --json number -q 'sort_by(.number) | .[0].number // empty')
  [[ -n $n ]] || n=$(gh issue list --label alerts --state closed --json number -q 'sort_by(.number) | .[0].number // empty')
  if [[ -z $n ]]; then
    n=$(gh issue create --title "System alerts" --label alerts \
      --body "The pipeline posts stalls, reverts, budget stops and planning reports here. Subscribe to this issue to get them by email." |
      grep -oE '[0-9]+$')
  fi
  echo "$n"
}

alert() { comment "$(alerts_issue)" "@$OWNER $1"; }

# Start the next workflow, unless the kill switch is on. When paused, leave a note so resume.sh can pick it up.
dispatch() { # workflow ref issue-or-empty key=value...
  local wf=$1 ref=$2 n=$3 kv args=(); shift 3
  for kv in "$@"; do args+=(-f "$kv"); done
  if paused; then
    if [[ -n $n ]]; then
      local next
      next=$(jq -cn --arg wf "$wf" --arg ref "$ref" '{wf:$wf, ref:$ref, inputs:$ARGS.positional}' --args "$@" | base64 -w0)
      comment "$n" "⏸️ Paused before \`$wf\`. Close the pause issue to carry on from here.
<!-- paused-next:$next -->"
    fi
    log "paused: not starting $wf"
    return 0
  fi
  gh workflow run "$wf" --ref "$ref" "${args[@]}"
  log "started $wf on $ref $*"
}

stall() { # issue reason [log-lines]
  local n=$1 reason=$2 details=${3:-} body
  remove_labels "$n" in-progress
  add_labels "$n" stalled
  body="🛑 **Stalled:** $reason"
  if [[ -n $details ]]; then
    body+=$'\n\n<details><summary>Last log lines</summary>\n\n```\n'"$details"$'\n```\n</details>'
  fi
  body+=$'\n\nTo retry from scratch, remove the `stalled` label and add `queued`.'
  comment "$n" "$body"
  alert "Task #$n stalled: $reason"
  dispatch dispatcher.yml main ""
}

# Fingerprint of every file under tests/, so CI can tell whether anyone but the adversary changed them.
tests_lock() {
  if [[ -d tests ]]; then
    find tests -type f -print0 | sort -z | xargs -0 -r sha256sum
  fi | jq -R -s -c 'split("\n") | map(select(length > 0) | capture("^(?<h>[0-9a-f]+)  (?<p>.+)$") | {(.p): .h}) | add // {}' | base64 -w0
}

# Throw away changes outside what this agent may touch. allow/deny are extended regexes on the path.
keep_only() { # allow-regex deny-regex
  local allow=$1 deny=$2 f dropped=()
  git add -A
  while IFS= read -r f; do
    [[ -z $f ]] && continue
    if [[ ! $f =~ $allow ]] || [[ -n $deny && $f =~ $deny ]]; then
      if git cat-file -e "HEAD:$f" 2>/dev/null; then
        git restore --source=HEAD --staged --worktree -- "$f"
      else
        git rm -q --cached -f -- "$f"; rm -f -- "$f"
      fi
      dropped+=("$f")
    fi
  done < <(git diff --cached --name-only)
  if ((${#dropped[@]})); then printf '%s\n' "${dropped[@]}" > .pipeline/dropped.txt; else : > .pipeline/dropped.txt; fi
}

git_push_setup() { # name
  git config user.name "$1"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git"
}

pr_for_branch() { gh pr list --head "$1" --state open --json number -q '.[0].number // empty'; }
