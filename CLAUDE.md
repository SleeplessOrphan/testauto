# Project summary for agents

Read this first. It is here so you don't have to search the whole repo to find your way around.
Keep it short and current: if your change adds a folder, a key module or a convention, update this file
in the same change.

## What this is

**Maths Snake** (see `spec/app.md`): a two-player, one-keyboard Snake game where players collect
correct answers to maths questions. Built autonomously, one small task at a time.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, strict mode. Deployed on Vercel.
- Tests: Vitest for unit tests, Playwright (Chromium) for end-to-end tests and staging smoke tests.
- Node 22. Path alias `@/` maps to `src/`.

## Layout

| Path | What it holds |
| --- | --- |
| `spec/app.md` | The spec: goals, user stories, acceptance criteria. Agents never edit it. |
| `src/app/` | Pages and routes (App Router). `page.tsx` is the home page. |
| `src/app/api/health/route.ts` | Health check used by the staging smoke test. Keep it. |
| `src/lib/` | Plain TypeScript logic (game rules, question generation). Keep it free of React so it is unit-testable. |
| `src/lib/maths/` | Question generation: `generate.ts` registers topics from `topics/`; see `docs/maths-questions.md`. |
| `tests/unit/` | Vitest tests, `*.test.ts`. |
| `tests/e2e/` | Playwright tests run against a local production build at `/`. |
| `tests/smoke/` | Playwright tests run against staging after every merge. |
| `docs/` | User guide, architecture notes, `decisions/` for design records. |
| `CHANGELOG.md` | One line per change under "Unreleased". |
| `.github/`, `scripts/`, `prompts/`, `models.yaml` | The pipeline itself. Agents never edit these. |

## Commands

- `npx tsc --noEmit`: type check
- `npx vitest run`: unit tests
- `npx next build`, then `npx playwright test --project=e2e`: end-to-end tests

## Conventions

- Put game and maths logic in `src/lib/` as pure functions; components only render and handle input.
- Tests find elements by role, label and visible text, so use semantic HTML and accessible labels.
- Every change updates `docs/` and `CHANGELOG.md` (CI fails otherwise).
- Keep each change under 300 lines and 10 files, not counting tests.
