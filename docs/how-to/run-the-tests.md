# Run the tests

## Prerequisites

- `npm ci` done.
- Postgres reachable through `DATABASE_URL` or `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`. The tests create `submission_wizard_test` and `submission_wizard_e2e` themselves and never touch the database a `DATABASE_URL` names.
- Chromium: `npx playwright install chromium` (once per machine). Set `PLAYWRIGHT_BROWSERS_PATH` if browsers live elsewhere.

## Everything

```bash
npm run verify
```

Lint, knip, format check, typecheck, all Vitest suites with coverage thresholds, then the production build and the Playwright suite. The expected counts are in the [testing strategy](../testing/strategy.md).

## One level at a time

| Goal                                       | Command                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Unit and integration (Node, real Postgres) | `npx vitest run --project server`                                                                                  |
| Component tests (Chromium)                 | `npx vitest run --project web`                                                                                     |
| All Vitest suites                          | `npm test`                                                                                                         |
| With coverage and thresholds               | `npm run test:coverage` (report in `coverage/`)                                                                    |
| End-to-end                                 | `npm run test:e2e` (seeds `submission_wizard_e2e`, builds the web app, serves the API on 4401 and preview on 5280) |
| One Playwright project                     | `npx playwright test --project tablet` (projects: `desktop`, `mobile` for `@mobile`, `tablet` for `@tablet`)       |

## One file or one test

```bash
npx vitest run server/tests/api.test.ts
npx vitest run server/tests/api.test.ts -t "keyset"
npx vitest run --project web web/tests/wizard.test.tsx
npx playwright test e2e/author.spec.ts -g "stale tab"
```

## When something fails

- **Server tests cannot connect:** check `pg_isready` with the same `PG*` variables; the user needs permission to create databases.
- **Component tests hang:** they use full Chromium (`channel: 'chromium'`); make sure it is installed for the Playwright version in the lockfile.
- **End-to-end ports busy:** stop anything on 4401 or 5280 (the suite does not reuse servers).
- **Schema test fails with "matches the committed SDL":** run `npm run schema:dump --workspace @submission-wizard/server && npm run codegen`.
- **Playwright traces:** kept for failures in `test-results/`; open with `npx playwright show-trace <file>`.
