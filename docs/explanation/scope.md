# Scope

## Goal

Authors prepare a submission over several sittings, each step saved as they move on, with unsaved edits never dropped without asking. Editors work through a queue and make decisions that reach the author at once. Every rule is defined once, in `shared/`, and enforced on the server.

## In scope

- **Wizard:** five steps (basics, manuscript upload, schedule, about you, review); save on advance; resume; Fix links; the unsaved-changes guard; conflict recovery that keeps typed edits.
- **Workflow:** draft → submitted → in review → accepted or declined; withdraw and revise; locked fields after acceptance; copies of earlier submissions (text fields only).
- **Editors:** a queue with status filters and keyset pages; claim, accept with a release date, decline with a note.
- **Authors:** an in-app inbox for decisions, with read state.
- **Platform:** demo seed data, light and dark themes, a responsive layout, security headers.

## Non-goals

Email delivery, sign-up and password reset, account management, contracts and payments, co-authors, a history of manuscript versions, running several API processes, malware checking of uploads.

## Constraints

See [architecture, chapter 2](architecture.md#2-constraints).

## Acceptance criteria

- `npm run verify` passes.
- Every feature in the [feature catalogue](../reference/features.md) links to its code and to at least one test in the [traceability matrix](../testing/traceability.md).
- Every GraphQL element has a description, and the committed SDL matches the schema.
- `npm audit --omit=dev` reports no known vulnerabilities in runtime dependencies.
