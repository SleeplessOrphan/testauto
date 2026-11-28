# Using OpenAI and Google models (open pipeline)

This applies to the `open-pipeline` branch. `main` stays the all-Claude pipeline.

Each role in `models.yaml` (planner, test writer, coder, escalation coder, reviewer) can run on Anthropic,
OpenAI or Google. Out of the box every role is still Anthropic, so nothing changes until you switch one.
A good first use is putting the **reviewer** (`adversary_review`) on another company's model, so the code
Claude writes is checked by a model that doesn't share its blind spots.

| `provider` | Coding tool the pipeline runs | GitHub secret it needs |
| --- | --- | --- |
| `anthropic` | Claude Code (`anthropics/claude-code-action`) | `ANTHROPIC_API_KEY` (already set) |
| `openai` | OpenAI Codex CLI (`@openai/codex`) | `OPENAI_API_KEY` |
| `google` | Gemini CLI (`@google/gemini-cli`) | `GOOGLE_API_KEY` |

The tools are installed fresh on GitHub's runner for each run. Nothing extra is hosted.

## 1. Get the API keys

Only get the ones you will use.

**OpenAI**
1. Go to [platform.openai.com](https://platform.openai.com) and sign in.
2. Click the settings cog (top right), then **Billing**. Add a payment method and some credit (for example $10).
3. Still in settings, open **Limits** and set a monthly budget (for example $10), so OpenAI stops at that amount whatever the pipeline does.
4. Open **API keys** (left menu), click **Create new secret key**, name it `testauto pipeline`, click **Create secret key** and copy it. You can't see it again after closing the box.

**Google**
1. Go to [aistudio.google.com](https://aistudio.google.com) and sign in.
2. Click **Get API key** (left menu), then **Create API key**, pick or create a project, and copy the key.
3. Click **Set up billing** next to the key and add a payment method. On the free tier the larger models are limited and Google may use your prompts to improve its products.
4. In the [Google Cloud console](https://console.cloud.google.com/billing), open **Budgets & alerts** and create a budget (for example $10). Note that a Google budget only emails you; it doesn't stop spending. The pipeline's own caps below still apply.

## 2. Add the keys to GitHub

1. Open the repo on GitHub, click **Settings** (top bar), then on the left **Secrets and variables** → **Actions**.
2. Stay on the **Secrets** tab and click **New repository secret**.
3. Name: `OPENAI_API_KEY`. Secret: paste the OpenAI key. Click **Add secret**.
4. Click **New repository secret** again. Name: `GOOGLE_API_KEY`. Secret: paste the Google key. Click **Add secret**.

The names must be exactly these. If a role uses a provider whose secret is missing, the task stalls with a
message saying which secret to add, and nothing is spent.

## 3. Switch a role to another provider

1. On the repo's main page, click the branch menu (it says **main**) and pick **open-pipeline**.
2. Open `models.yaml` and click the pencil icon.
3. Change the role's line. For example, to make an OpenAI model the reviewer:
   `adversary_review: { provider: openai, model: gpt-6.2-sol, max_turns: 40, effort: medium }`
   or a Google model: `adversary_review: { provider: google, model: gemini-4-neon, max_turns: 40 }`
4. Click **Commit changes**, choose **Commit directly to the open-pipeline branch**, and confirm.

The model must be listed under `prices` in the same file (several are already there). If it isn't, add a
line with its price from the provider's pricing page, as `[input, cached input, output]` in dollars per
million tokens. A model with no price makes the task stall instead of running, because its spend couldn't
be counted.

## 4. Make the pipeline run from the open-pipeline branch

GitHub always starts automatic workflows (labels on issues, the hourly watchdog) from the repo's
**default branch**, which is `main`. So a model change on `open-pipeline` is only used when the pipeline
runs from `open-pipeline`. Once a run starts there, every later stage of that task stays there. There are
two ways to start it.

**To try it without changing settings:** go to **Actions** → **dispatcher** (left list) → **Run workflow**,
set **Use workflow from** to `open-pipeline`, and click **Run workflow**. The next queued task runs with
`open-pipeline`'s settings, and the tasks after it follow on the same branch. The catch: changing labels (for example retrying a stalled task) starts the
pipeline from `main` again, so that retry runs on Claude. If you want retries to stay on the other
models too, use the second way.

**To use it for everything:** make `open-pipeline` the default branch. First move the merge protection so
it stays on `main`, because the ruleset targets "the default branch":
1. **Settings** → **Rules** → **Rulesets** → click **main**.
2. Under **Target branches**, remove **Default** and click **Add target** → **Include by pattern**, type `main`, and click **Add inclusion pattern**. Click **Save changes**.
3. **Settings** → **General** → **Default branch**, click the switch icon, pick `open-pipeline`, click **Update** and confirm.

To go back to the Claude pipeline, switch the default branch back to `main` the same way.

Either way, the app itself is still built from `main` and merged into `main`, and Vercel still deploys
`main`. Only the pipeline's own files (workflows, scripts, prompts and `models.yaml`) come from
`open-pipeline`. Spec changes on `main` still start `main`'s planner; to plan with `open-pipeline`'s
planner, run **planner** from the Actions tab with **Use workflow from** set to `open-pipeline`.

## How spending is counted and capped

- Claude reports its own cost. Codex and Gemini report token counts, and the pipeline turns them into
  dollars with the `prices` table. The cost of every run is a comment on the task issue, as before, so the
  $1.50 per-task cap and the $45 monthly pause count all providers together.
- To be safe, the counting leans high: OpenAI's reasoning tokens are added to its output tokens, and a
  Gemini helper model without a price is charged at the role model's price.
- Codex has no turn limit, so OpenAI and Google runs also have a time limit (20 minutes, 35 for the coder).
  A run stopped at that limit hasn't reported its tokens, so it is counted as the whole per-task budget
  ($1.50), which stalls the task. The true figure is on the provider's billing page.
- The spending limits you set on the OpenAI and Google sites are the hard backstop, like the Anthropic
  Console limit.

## Differences from Claude roles

- Claude roles are held to a list of allowed commands by Claude Code itself. Codex and Gemini are told the
  same list in their instructions but not technically held to it. The other guards are the same for every
  provider: changes outside what the role may touch are thrown away, CI and the protected-files check still
  run, the pipeline scripts are copied in again after the agent finishes, and the GitHub token is never
  given to the agent.
- `effort` works for OpenAI (`low`, `medium`, `high`, `xhigh`) but is ignored for Google.
- `max_turns` works for Google (Gemini CLI's session turn limit) but not for OpenAI, which uses the time
  limit above.
- On 28 Nov 2026 the GPT-6.2 prices in `models.yaml` were checked against OpenAI's own pricing page and
  match. Google's pricing page doesn't list Gemini 4 yet, so the Gemini 4 prices (Neon, Hydrogen, Carbon,
  Argon) still come from price-comparison sites. Check them on the provider's pricing page before you
  rely on them. A wrong price only changes what the caps count, not what the provider charges.
