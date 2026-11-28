---
# Change this to `ready` when the spec is filled in. The planner ignores the spec while it says `draft`.
status: draft
---

# App name

One or two sentences: what the app is and who it is for.

## Goals

- What a user can do with the app that they can't do today.

## Non-goals

- Things the app deliberately does not do (yet). The planner will not create tasks for these.

## User stories

Each story becomes one or more small tasks. Keep each story to something one pull request can do.
Acceptance criteria are what the adversary turns into tests, so make them observable in a browser.

### Story 1: <short name>

As a <kind of user>, I want to <do something> so that <reason>.

Acceptance criteria:
- Given <starting state>, when <action>, then <what the user sees>.
- ...

### Story 2: <short name>

As a ..., I want ... so that ....

Acceptance criteria:
- ...

## Constraints

- Tech: Next.js (App Router) and TypeScript, deployed on Vercel. Add a database only when a story needs one.
- Anything else the system must respect (accessibility level, browsers, data rules).
