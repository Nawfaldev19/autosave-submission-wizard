# Contributing

Submission Wizard is a small demo project; contributions are welcome when they keep it small, tested and documented. Please read the [code of conduct](CODE_OF_CONDUCT.md) first.

## Prerequisites

- Node 22.12+ or 24+ (CI uses [`.nvmrc`](.nvmrc)).
- PostgreSQL reachable through `DATABASE_URL` or the `PG*` variables; CI tests version 16. The tests create their own `submission_wizard_test` and `submission_wizard_e2e` databases.
- Chromium for Playwright: `npx playwright install chromium`.

## Setup

```bash
npm ci
npm run db:setup   # empties and reseeds the development database
npm run dev        # API on :4400, web on :5180
```

Step by step: [getting started](docs/tutorials/getting-started.md).

## The gate

```bash
npm run verify
```

It runs ESLint (with TSDoc rules, no warnings allowed), knip, Prettier, the type checks, every Vitest suite with coverage thresholds, then the production build and the Playwright suite. A pull request must pass it. CI runs the same steps plus a dependency audit and dependency review.

## Branches and commits

- Branch from `main` with a short descriptive name, such as `feat/queue-filter-by-form` or `fix/upload-focus`.
- Write commit messages in [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) form: `feat(web): …`, `fix(server): …`, `docs: …`, `test(e2e): …`, `ci: …`, `chore: …`. Mark breaking changes with `!` or a `BREAKING CHANGE:` footer.
- Keep each pull request to one change.

## Code style

- Strict TypeScript, formatted by Prettier (`npm run format`) and linted by ESLint (`npm run lint`).
- Every source file starts with a short header comment saying what it is responsible for; reviews check this, since no linter does. Comments explain why and state invariants. No commented-out code, and no TODO without a CHANGELOG or limitations entry.
- Rules that both sides need go in `shared/`, which may not import Node or React. Services in `server/src/domain` check the viewer first and throw typed errors.

## Documentation

- **In code:** ESLint's `jsdoc/require-jsdoc` fails the lint step when an exported function, class, component, interface, type alias or constant in `shared/src`, `server/src` or `web/src` has no [TSDoc](https://tsdoc.org) comment. Every GraphQL type, field, argument, enum value and input field needs a `description`; `server/tests/schema.test.ts` enforces that and checks that the committed SDL is current. After a schema change run `npm run schema:dump --workspace @submission-wizard/server && npm run codegen`.
- **In the same pull request** as a behaviour change, update the feature's entry in [the catalogue](docs/reference/features.md) (a new feature takes the next `F-` number and a line in the README), the [traceability matrix](docs/testing/traceability.md), the counts in the [testing strategy](docs/testing/strategy.md), [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)), and any other page it makes untrue.
- **Decisions** with real alternatives get a record in [docs/adr](docs/adr/README.md), in the MADR format the existing ones use.

## Adding tests

| Level       | Where                                                              | Use it for                                 |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Unit        | `shared/tests`, `server/tests/{auth,rateLimit,config}.test.ts`     | Pure rules and helpers                     |
| Integration | `server/tests/api.test.ts`, through `app.fetch` on a real database | API behaviour, authorisation, SQL, headers |
| Component   | `web/tests/*.test.tsx`, in real Chromium with a scripted network   | Screens, forms, focus, announcements       |
| End-to-end  | `e2e/*.spec.ts`, on the full stack with a seeded database          | Journeys across pages and tabs             |

Find elements by role and accessible name, keep test data fictional, and pin the clock where dates matter. See [run the tests](docs/how-to/run-the-tests.md).

## Security boundaries and generated files

- Never commit secrets, and never print `.env` files.
- Query through Drizzle's builder or its `sql` template; never concatenate SQL.
- Validate input with the shared Zod schemas in `server/src/domain`, and configuration in `server/src/config.ts`. Start every service with `requireViewer` or `requireRole`.
- Keep the request guards and security headers in `server/src/http/app.ts`, with tests for any change.
- Keep seed and test data fictional (`example.com`).
- Do not edit by hand: `web/src/gql/**` and `server/schema.graphql` (generated), `package-lock.json` (use `npm install`), and released SQL migrations (add a new numbered file).

## Security issues

Do not open a public issue; see [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
