# Changelog

## Unreleased

### Added
- Arithmetic maths question generator (addition, subtraction, multiplication, division, squares, square roots) by difficulty. See `docs/maths-questions.md`. (#8)
- Next.js + TypeScript starter app with a health endpoint, Vitest unit tests, Playwright end-to-end tests and staging smoke tests.
- Autonomous pipeline in GitHub Actions: planner, adversary tests-first, coder, CI, adversary review with the `adversary-verdict` check, automatic merge, staging smoke test with automatic revert, dispatcher, hourly watchdog, pause switch. See `docs/pipeline.md`.
- `vercel.json` pins the Vercel framework preset to Next.js (the project was created before the repo had an app).
- `models.yaml` to choose the model and limits for each agent role.
- Spec template in `spec/app.md`.
- Setup steps in `docs/setup.md` and decision record `docs/decisions/0001-pipeline-in-github-actions.md`.

### Changed
- `coder.yml` is now started by the pipeline after the adversary's tests exist, instead of directly by the `task` label. The `task` label now queues the issue.
- Homepage (`index.html`) that says hello. See `docs/homepage.md`. (#1)
