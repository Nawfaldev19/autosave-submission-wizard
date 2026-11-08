## What and why

<!-- What changes, and the reason. Link the issue if there is one. -->

## Checklist

- [ ] `npm run verify` passes locally (lint, knip, format, types, tests with coverage, build and end-to-end).
- [ ] Tests added or updated for the change, at the level that proves it.
- [ ] Docs updated: the feature's entry in `docs/reference/features.md`, `docs/testing/traceability.md`, the counts in `docs/testing/strategy.md`, an ADR in `docs/adr/` if a decision was made, and `CHANGELOG.md` under `[Unreleased]`.
- [ ] If the GraphQL schema changed: every new element has a description, and `server/schema.graphql` and `web/src/gql` were regenerated.
- [ ] Accessibility considered: keyboard path, focus, labels and announcements (WCAG 2.2 AA).
- [ ] Security considered: input validated at the boundary, authorisation enforced in the service, no secrets or personal data in code, logs or tests.
- [ ] Commit messages follow Conventional Commits.
