# Changelog

## Unreleased

### Changed
- Archived Maths Snake under the git tag `maths-snake-v1` and reset the app to the starter page, so the pipeline is ready for the next app. `spec/app.md` is back to the blank template (`status: draft`), and Vercel skips deploys while the spec is a draft, so the last Maths Snake deploy stays live until the next app starts. See `docs/setup.md`.

### Added
- `CLAUDE.md` project map that every agent reads first, kept current by the coder.
- The planner saves each plan on a "Planner output" issue and reuses it if a run fails, instead of paying to plan again.
- npm and Playwright browser caching in every workflow that runs the tests.
- Next.js + TypeScript starter app with a health endpoint, Vitest unit tests, Playwright end-to-end tests and staging smoke tests.
- Autonomous pipeline in GitHub Actions: planner, adversary tests-first, coder, CI, adversary review with the `adversary-verdict` check, automatic merge, staging smoke test with automatic revert, dispatcher, hourly watchdog, pause switch. See `docs/pipeline.md`.
- `vercel.json` pins the Vercel framework preset to Next.js (the project was created before the repo had an app).
- `models.yaml` to choose the model and limits for each agent role.
- Spec template in `spec/app.md`.
- Setup steps in `docs/setup.md` and decision record `docs/decisions/0001-pipeline-in-github-actions.md`.

### Changed
- Per-task cap raised to $1.50.
- Pipeline: Sonnet roles run at medium effort (per-role `effort` in `models.yaml`), and the coder runs only its own task's e2e tests; CI still runs the full suite. See `docs/pipeline.md`.
- If main moves while a task is running, the pipeline merges main into the task branch and re-runs CI and review instead of stalling.
- Extra pull_request runs that GitHub opens on agent PRs now skip, so approving one by hand can't block the merge.

### Fixed (pipeline)
- After the adversary corrects a disputed test, a coder round with nothing to change sends the task back to CI instead of stalling it. The adversary is told not to write e2e tests that depend on CI machine speed. (#24)
- Pipeline audit fixes: a merged task whose staging check failed is retried by re-checking staging, not rebuilt; CI setup hiccups re-run CI for free instead of a paid coder round; cancelled CI runs no longer start a second coder round; merges and smoke tests get a short retry; `stalled` + `queued` in either order retries at once; a monthly budget pause (`monthly_usd`); an "all done" alert; Vercel no longer builds task branches.
- Adding `queued` to an issue by hand now starts the dispatcher at once. Before, a retried task sat in the queue until some other run happened to start the dispatcher.
- Tasks now run strictly in order: while a task is stalled, no new task starts. Implicit `any` errors in the adversary's tests (caused by code that doesn't exist yet) no longer stall a task. (#15, #16)
- Merging main into a task branch no longer trips the test lock: tests that came unchanged from main are allowed. `CHANGELOG.md`, `CLAUDE.md` and `docs/` no longer count toward the 10-file limit. (#11, #14)
- Retrying a stalled task now gives it a fresh round limit and budget. Before, a retried task that had used its rounds stalled again straight away. (#11)
- Staging waited 15 minutes for a GitHub Deployment that Vercel never creates for this project, then stalled the task. It now also accepts Vercel's commit status on the merged commit.
- When the coder makes no changes because it thinks a test is wrong, the adversary now checks that test once instead of the task stalling straight away (task #11 stalled this way).
- The commit statuses from the last fix were never posted on older task branches: dispatched runs used the branch's outdated workflow file, which had no permission to post them. `ci` and `adversary-review` now always run from main's workflow files and take the branch to check as an input.
- Retrying a stalled task picks up where it stopped instead of paying for every AI stage again, and an adversary approval is reused when the task's changes are unchanged. Add the `restart` label to start over.
- Agent PRs still couldn't merge: GitHub ignores check runs from `workflow_dispatch` runs for required checks. The pipeline now also reports each check result and the adversary's verdict as commit statuses, which count.
- If the System alerts issue was closed, the pipeline opened a new one. It now keeps using the old one.
- Agent PRs could never merge: GitHub held the duplicate pull_request runs for approval, and a held run blocks the merge. `ci` and `adversary-review` now run on pushes instead of pull_request.
- The coder could get past a type error in the adversary's tests by excluding `tests` in `tsconfig.json`. `tsconfig*.json`, `next.config.*`, `vercel.json` and `.gitattributes` are now protected, the adversary's tests must type-check before the coder starts, and the review treats a weakened check as a blocker.
- When GitHub refused a merge, the stall message said "unknown reason" because the error was lost in a subshell. It now shows GitHub's message.
- Setup steps say to turn off the ruleset's extra approval for unattributed changes, which blocks every agent merge.
- Run names containing `#` were cut off (YAML comment), which hid the task number from the watchdog.

### Changed (earlier)
- Per-task spend cap lowered from $3 to $1.
- The planner only re-runs when `spec/` changes (or when started by hand).
- `coder.yml` is now started by the pipeline after the adversary's tests exist, instead of directly by the `task` label. The `task` label now queues the issue.
- Homepage (`index.html`) that says hello. See `docs/homepage.md`. (#1)
