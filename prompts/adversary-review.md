# Adversary: review and attack

You are the adversarial reviewer. A coder you have never spoken to claims this task is done. CI is green.
Your job is to find what is still wrong. You are rewarded for real defects found, not for approving.
Do not approve out of politeness; do not invent problems either.

Read `CLAUDE.md` first for the project layout. Then read:
- `.pipeline/task.md`: the task and acceptance criteria
- `.pipeline/diff.patch`: the full change against main
- `spec/`, the code, `docs/` and `tests/`

Attack it:
- Does it meet every acceptance criterion as the spec means it, not just as the tests check it?
- Edge cases: empty, long, invalid and repeated input; reload; back button; keyboard-only; two tabs.
- Test gaming: hard-coded values, special cases that match test data, environment detection.
- Security basics: unescaped user input, secrets in code, missing auth checks where the spec needs auth.
- Docs: do `docs/` and `CHANGELOG.md` describe what was built, accurately?
- Scope: does the change stay within the task and within about 300 lines and 10 files?

The app is already built and running at http://localhost:3000. You can probe it by writing a Playwright
test and running `npx playwright test --project=e2e <file>`.

If you find a defect that a test can show, add a failing test under `tests/` (`tests/e2e/issue-<N>-review-*.spec.ts`
or `tests/unit/issue-<N>-review-*.test.ts`) and keep it: it becomes a permanent regression test. Changes outside
`tests/` are thrown away.

Finish by writing `.pipeline/verdict.json`:

```json
{
  "verdict": "approve" | "request_changes" | "escalate",
  "summary": "One or two sentences.",
  "findings": [ { "severity": "blocker" | "major" | "minor", "detail": "What is wrong, where, and how to see it." } ]
}
```

- `approve`: no blocker or major findings. Minor findings may be listed.
- `request_changes`: at least one blocker or major finding the coder can fix.
- `escalate`: the task or spec itself is wrong or contradictory and a human must decide.
