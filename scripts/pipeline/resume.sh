#!/usr/bin/env bash
# Runs when the pause issue is closed: restarts whatever step each running task was paused before.
source "$(dirname "$0")/lib.sh"
if paused; then log "still paused"; exit 0; fi
for n in $(gh issue list --label in-progress --state open --json number -q '.[].number'); do
  pending=$(markers "$n" paused-next | wc -l)
  done_=$(markers "$n" resumed | wc -l)
  if (( pending > done_ )); then
    next=$(last_marker "$n" paused-next | base64 -d)
    wf=$(jq -r .wf <<<"$next"); ref=$(jq -r .ref <<<"$next")
    mapfile -t kvs < <(jq -r '.inputs[]' <<<"$next")
    comment "$n" "▶️ Resumed: starting \`$wf\`.
<!-- resumed:$wf -->"
    dispatch "$wf" "$ref" "$n" "${kvs[@]}"
  fi
done
dispatch dispatcher.yml main ""
