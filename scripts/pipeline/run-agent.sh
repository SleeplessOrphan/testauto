#!/usr/bin/env bash
# Runs one agent on a provider other than Anthropic (Anthropic roles use anthropics/claude-code-action).
#   run-agent.sh "<prompt>"
# Inputs from the environment:
#   PROVIDER (openai | google), MODEL, EFFORT (optional), MAX_TURNS, AGENT_MINUTES (wall-clock limit),
#   ALLOWED (the shell commands this role may run, told to the agent), and the key: CODEX_API_KEY for
#   OpenAI, GEMINI_API_KEY for Google.
# Writes an execution file in the same shape claude-code-action writes ([{type: "result", total_cost_usd}]),
# so agent.sh and plan.sh record the cost the same way for every provider. The cost is worked out from the
# token counts the CLI reports and the model's price in models.yaml (`prices`).
source "$(dirname "$0")/lib.sh"
prompt=${1:?prompt}
: "${PROVIDER:?}" "${MODEL:?}"
minutes=${AGENT_MINUTES:-20}
dir="$RUNNER_TEMP/agent-run"
mkdir -p "$dir"
raw="$dir/raw-output.jsonl"
exec_file="$dir/execution.json"
echo "execution_file=$exec_file" >> "$GITHUB_OUTPUT"

prompt+="

Read CLAUDE.md first: it maps the project. Work only inside this repository.
The only shell commands you may run are: ${ALLOWED:-none}. Do not run git, gh or curl, and do not install global tools."

prices=$(yq -o=json '.prices // {}' "$CFG")
status=0

case $PROVIDER in
  openai)
    : "${CODEX_API_KEY:?OPENAI_API_KEY secret is empty}"
    npm install -g --silent @openai/codex@latest >/dev/null
    args=(exec --json --model "$MODEL" --dangerously-bypass-approvals-and-sandbox)
    if [[ -n ${EFFORT:-} ]]; then args+=(-c "model_reasoning_effort=$EFFORT"); fi
    timeout "${minutes}m" codex "${args[@]}" "$prompt" > "$raw" || status=$?
    # One usage object per turn. input_tokens includes the cached ones. Reasoning tokens are added to output
    # on purpose: if the CLI already counts them in output_tokens, this overstates the cost rather than
    # understating it.
    cost=$(jq -R -s --argjson p "$prices" --arg m "$MODEL" '
      [split("\n")[] | fromjson? | select(.type == "turn.completed") | .usage // {}] as $u
      | ([$u[].input_tokens // 0] | add // 0) as $in
      | ([$u[].cached_input_tokens // 0] | add // 0) as $c
      | ([$u[] | (.output_tokens // 0) + (.reasoning_output_tokens // 0)] | add // 0) as $o
      | $p[$m] as $r
      | ((($in - $c) * $r[0] + $c * $r[1] + $o * $r[2]) / 1000000)' "$raw")
    ;;
  google)
    : "${GEMINI_API_KEY:?GOOGLE_API_KEY secret is empty}"
    npm install -g --silent @google/gemini-cli@latest >/dev/null
    mkdir -p ~/.gemini
    jq -n --argjson t "${MAX_TURNS:-40}" \
      '{model: {maxSessionTurns: $t}, privacy: {usageStatisticsEnabled: false}}' > ~/.gemini/settings.json
    GEMINI_CLI_TRUST_WORKSPACE=true timeout "${minutes}m" \
      gemini -p "$prompt" --model "$MODEL" --approval-mode yolo --output-format json > "$raw" || status=$?
    # Gemini may use other (usually cheaper) models for small internal steps. Each is priced on its own; one
    # without a price is charged at the role model's price. `prompt` includes the cached tokens.
    cost=$(sed -n '/^{/,$p' "$raw" | jq -s --argjson p "$prices" --arg m "$MODEL" '
      (last // {}) | .stats.models // {} | to_entries
      | map(.key as $k | .value.tokens as $t | ($p[$k] // $p[$m]) as $r
          | (((($t.prompt // 0) - ($t.cached // 0)) * $r[0] + ($t.cached // 0) * $r[1]
              + (($t.candidates // 0) + ($t.thoughts // 0)) * $r[2]) / 1000000))
      | add // 0' 2>/dev/null || echo 0)
    ;;
  *) echo "::error::run-agent.sh does not know provider '$PROVIDER'"; exit 1 ;;
esac

if (( status == 124 )); then
  # Killed at the time limit before the CLI reported its token counts. Count the whole per-task budget, so the
  # caps stay safe; the true figure is on the provider's billing page.
  cost=$(cfg .limits.per_task_usd)
  echo "::warning::$PROVIDER agent hit the ${minutes}-minute limit; its cost is unknown and counted as \$$cost."
fi
cost=$(printf '%.4f' "${cost:-0}")
jq -n --argjson c "$cost" --arg p "$PROVIDER" --arg m "$MODEL" --argjson s "$status" \
  '[{type: "result", total_cost_usd: $c, provider: $p, model: $m, exit_code: $s}]' > "$exec_file"
log "$PROVIDER $MODEL finished with exit code $status, cost \$$cost"
