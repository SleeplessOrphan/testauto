# Changelog

## Unreleased

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
- Per-task spend cap lowered from $3 to $1.
- The planner only re-runs when `spec/` changes (or when started by hand).
- `coder.yml` is now started by the pipeline after the adversary's tests exist, instead of directly by the `task` label. The `task` label now queues the issue.
- Homepage (`index.html`) that says hello. See `docs/homepage.md`. (#1)
