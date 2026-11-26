# 0001: Run iteration one entirely in GitHub Actions

Date: 2026-11-26. Status: accepted.

## Context

The system must run fully autonomously in the cloud, with a coder agent, an independent adversary,
strict merge gates, staging smoke tests with automatic revert, and a watchdog. Budget is about $50 a month.

## Decision

- Drive everything from GitHub Actions workflows, using issue labels as the state machine. No server yet.
- Agents only edit files in the workspace. Plain shell steps do every GitHub action (commit, PR, merge,
  labels), so an agent cannot approve, merge or relabel its own work.
- Workflows start each other with `workflow_dispatch`, because events caused by `GITHUB_TOKEN` don't trigger workflows.
- The adversary's verdict is a job named `adversary-verdict`, made a required check by the ruleset on main.
- The coder can't change tests: its test edits are discarded, and CI compares `tests/` with a lock the adversary posts on the issue.
- One task at a time, staging one at a time, so "in order" holds without a queue service.
- Run the watchdog hourly to stay inside the free 2,000 Actions minutes for a private repo.

## Consequences

- Simple to inspect: every step is an issue comment, a PR comment or an Actions run.
- One GitHub identity for both agents; separation relies on what each step may change. Iteration two
  can move to two GitHub Apps and an orchestrator service with a model gateway.
- Only Anthropic models until that gateway exists.
