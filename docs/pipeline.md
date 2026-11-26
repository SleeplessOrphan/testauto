# How the pipeline works

The system builds the app in `spec/app.md` one small task at a time. A coder agent writes the code,
an independent adversary agent writes the tests first and then attacks the result, and GitHub Actions
referees. Nothing waits for a human: approved changes merge on their own, deploy to staging, and are
reverted automatically if the staging smoke test fails. You get notified on the **System alerts** issue.

Everything runs in GitHub Actions and Vercel. Nothing runs on your computer.

## The stages of a task

Each task is a GitHub issue. Its labels show where it is: `queued`, then `in-progress` plus one
`stage:*` label, then `done` (closed) or `stalled`.

| Stage | Workflow | What happens | Next |
| --- | --- | --- | --- |
| plan | `planner.yml` | When `spec/` changes on main and the spec says `status: ready`, the planner (Opus) writes one issue per small task, labelled `queued`. | dispatcher |
| pick | `dispatcher.yml` | If nothing is running, takes the oldest `queued` task, creates branch `task/<n>` from main. One task at a time, in order. | tests |
| `stage:tests` | `adversary-tests.yml` | The adversary (Sonnet) writes failing tests from the acceptance criteria, before any code. The pipeline records a fingerprint ("lock") of `tests/`. | code |
| `stage:code` | `coder.yml` | The coder (Sonnet) makes the tests pass, updates `docs/` and `CHANGELOG.md`, and the pipeline opens or updates the pull request. | ci |
| `stage:ci` | `ci.yml` | build, unit, e2e, docs-check, size-check, protected-files. Red sends feedback to the coder for another round. | review |
| `stage:review` | `adversary-review.yml` | The adversary reviews the diff and probes the running app. It can add new failing tests. Its verdict is the `adversary-verdict` check. Approve merges the PR. | staging |
| `stage:staging` | `staging.yml` | Waits for Vercel to deploy the merge, runs `tests/smoke` against it. Pass closes the task. Fail opens a revert PR, which is checked and merged automatically. | dispatcher |

Workflows start each other with `workflow_dispatch`. That is deliberate: actions taken with the built-in
`GITHUB_TOKEN` (pushes, PRs, merges) do not trigger other workflows, so each step starts the next one explicitly.

## The guardrails

| Requirement | How it is enforced |
| --- | --- |
| Agents can't mark their own work as passing | Agents only edit files. Shell steps commit, open PRs and merge. The merge only happens after the `adversary-verdict` job passes, and the ruleset on main makes GitHub refuse it unless every required check is green. |
| The coder can't change the tests | Changes the coder makes under `tests/` are thrown away before committing, and `protected-files` fails if `tests/` differs from the adversary's last lock. |
| Agents can't change the rules | Changes to `.github/`, `scripts/`, `prompts/`, `spec/`, `models.yaml` and the test configs are thrown away, and `protected-files` fails if any slip through. The scripts each workflow runs are copied from main before the agent starts. |
| Small changes | `size-check` fails task PRs over 300 changed lines or 10 files (tests and the lockfile don't count). That stalls the task so it can be split. |
| Fully documented | `docs-check` fails if `src/` changed without `docs/` or `CHANGELOG.md`. The adversary also reviews the docs. |
| Tests are logged | Unit and Playwright runs upload JUnit XML, the Playwright report, traces and screenshots as artifacts (kept 30 days). A run with no log fails. Every agent run's cost and result is a comment on the task issue. |
| Staging in order | One task runs at a time. Staging runs one at a time (`concurrency: staging`), in merge order, and the next task starts only after staging passes or the task stalls. |
| Bounded retries and spend | Up to 3 coder rounds on Sonnet, then one round on Opus, then stall. The same failures twice in a row skip straight to the Opus round. A task stalls once it has spent $1 (see `models.yaml`). Claude's turn limits cap each run; the Anthropic Console spend limit caps the month. |
| Timeouts flag stops | Every job has `timeout-minutes`. The watchdog (hourly) stalls a task whose stage workflow failed, or that sat in a stage longer than `stage_minutes` with nothing running, and posts the last log lines. |

A stalled task gets the `stalled` label, a comment with the reason, and a mention of you on the
**System alerts** issue, which emails you. Other queued tasks carry on.

## Keeping costs down

- **Prompt caching** is on by default in Claude Code, so text an agent re-reads within a run costs about 90% less.
- **`CLAUDE.md`** is a one-page map of the project. Every agent reads it first instead of searching the repo, and the coder keeps it current.
- **Saved plans.** The planner saves each plan on the closed **Planner output** issue, keyed by a fingerprint of `spec/`. If a run fails after planning, run **planner** again from the Actions tab and it reuses the saved plan for free. A spec that has already become tasks is never planned twice.
- **Cached installs.** npm packages and the Playwright browser are cached between runs, which saves Actions minutes.

## Controls

- **Pause everything:** open an issue (any title, e.g. "Pause") and add the label `pause`. Running steps finish and then wait. Close the issue to resume from where it stopped.
- **Add a task by hand:** open an issue describing it with acceptance criteria and add the label `task`.
- **Retry a stalled task:** remove `stalled` and add `queued`. It starts again from scratch on a fresh branch.
- **Change a model or limit:** edit `models.yaml` in your own pull request.

## Your own pull requests

CI runs on them as usual. The `adversary-verdict` check passes automatically for pull requests opened by
the repository owner, so you can merge your own changes (for example, spec edits) once CI is green.
`size-check` and `protected-files` only apply to agent branches.

## Known limits in iteration one

- Only Anthropic models: every agent runs through `anthropics/claude-code-action`. The `provider` field in `models.yaml` is for iteration two's gateway.
- The coder and adversary both act through the same GitHub Actions identity. They are kept apart by what each step is allowed to change, not by separate GitHub Apps.
- No weekly spend report yet. Per-task cost is on each issue and the total is in the Anthropic Console.
- The watchdog runs hourly to stay inside the free Actions minutes; change the cron in `watchdog.yml` if you have more minutes.
