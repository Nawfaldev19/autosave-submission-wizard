---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# One language and shared rules

## Context and Problem Statement

The wizard validates in the browser for instant feedback and on the server because the browser cannot be trusted. Two hand-written copies of the same rules drift apart, and then a draft the review step calls complete is refused on submit, or the reverse.

## Decision Drivers

- The browser and the server must agree on what "complete" means.
- Feedback in the wizard should not need a round trip.
- The server re-checks everything.

## Considered Options

- TypeScript everywhere, with a platform-neutral `shared/` workspace
- Separate validation code on each side
- Server-only validation

## Decision Outcome

Chosen option: a `shared/` workspace. The per-step Zod schemas, `readiness()`, the workflow table, the date rules, the decline-note rule and the upload sniffing live there. React Hook Form uses the schemas through `zodResolver`; the server parses the same schemas and runs the same `readiness()` before a submit.

### Consequences

- Good, because a rule changes in one file and both sides follow.
- Bad, because `shared/` may not use Node or browser APIs, which ESLint enforces.

### Confirmation

`no-restricted-imports` on `shared/src/**` in `eslint.config.js`. The rules tests in `shared/tests/rules.test.ts` and the API test "validates input with the shared schemas" run the same rules on both sides.

## Pros and Cons of the Options

- **Shared workspace:** one definition of every rule; the cost is the platform-neutral constraint.
- **Separate code per side:** each side may use its own libraries, but the copies drift.
- **Server-only:** one copy, but the author waits for the network to learn a synopsis is too short.

## More Information

[F-02](../reference/features.md#f-02-five-step-submission-wizard), [F-03](../reference/features.md#f-03-readiness-checklist-and-fix-links).
