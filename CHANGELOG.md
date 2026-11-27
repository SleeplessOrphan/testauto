# Changelog

## Unreleased
- Results screen with winner or draw, per-player statistics table, Play Again, Change Settings and Main Menu. (#22)
- Game mode choice on setup (Timed, Survival, Target Score, Practice), countdown timer, target display, unlimited lives in Practice, and game end with a winner/draw placeholder. (#21)
- Game mode rules engine (Timed, Survival, Target Score, Practice) with unlimited lives in Practice. (#20)
- Gameplay difficulty (Easy 3 cells/s no obstacles, Medium 5/s 4 obstacles, Hard 8/s 8 obstacles) with obstacle generation, drawing and collisions. (#19)
- Lives and respawning: three lives each, a crash respawns the snake safely (score, question and tiles kept), the last life eliminates the player; lives and crash feedback in the panel. (#18)
- Answer streaks: +20 bonus at 5 and 10 correct in a row, streak shown next to the score, longest streak tracked. (#17)
- Scoring: +10 and growth for a correct answer, -5 and shrinking for an incorrect one, a new question next cycle, per-player score and feedback. See `docs/game-engine.md`. (#16)
- Each player now sees their own maths question above the board, and three answer tiles (number, colour, P1/P2) are placed on free cells reachable from their head. If there is no room the round ends with "Round over". (#15)

### Fixed
- Snakes whose heads enter the same cell now both stop, and a stopped snake's tail blocks the other snake. (#14)

### Added
- Canvas game screen with countdown, fixed-rate loop and keyboard controls. See `docs/game-screen.md`. (#14)
- Simultaneous collision detection (`src/lib/game/collision.ts`); `step()` reports collided players. See `docs/game-engine.md`. A head proposed onto the snake's own neck (a reversal) is not a self-collision. (#11)
- Game setup screen with names, per-player difficulty and topics, validation and a placeholder game screen. See `docs/game-setup.md`. (#13)
- Main menu with Play, Instructions and Settings screens replacing the starter page. (#12)
- Combined the maths question code from tasks #8 and #9, which were built side by side and merged into each other's files. `generateQuestion` now serves the arithmetic topics plus percentages and mixed operations.
- Snake movement engine on a 40 x 25 grid in `src/lib/game/`; see `docs/game-engine.md`.
- Maths question generator (`src/lib/maths/`) with percentage and mixed-operation topics. See `docs/maths-questions.md`.
- Maths question generation (addition, subtraction, multiplication, division, squares, square roots) by difficulty in `src/lib/maths/`. See `docs/maths-questions.md`. (#8)
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
- If main moves while a task is running, the pipeline merges main into the task branch and re-runs CI and review instead of stalling.
- Extra pull_request runs that GitHub opens on agent PRs now skip, so approving one by hand can't block the merge.

### Fixed (pipeline)
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
