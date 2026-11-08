# Supply chain

How dependencies and the build are kept trustworthy, structured after the [OpenSSF Scorecard checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md).

## Dependency policy

- **Permissive licences only** (MIT, ISC, BSD, Apache-2.0) for direct dependencies; transitive exceptions and their reasons are in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md), updated in the same pull request as the dependency. For that reason axe-core (MPL-2.0) is run [outside the repository](../how-to/audit-accessibility.md) rather than added.
- **Each workspace declares what it imports;** knip fails the gate on an unused or undeclared dependency.
- **The lockfile is committed,** and CI installs with `npm ci`, which refuses a lockfile that does not match `package.json`.
- **Few runtime dependencies:** the server ships `graphql`, `graphql-yoga`, Pothos, `drizzle-orm`, `pg`, `dataloader` and `zod`; the browser bundle ships React, React Router, urql, React Hook Form, Zod, Lucide icons and self-hosted fonts.

## Scorecard checks

| Check                  | How the repository addresses it                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token-Permissions      | Every workflow sets `permissions: contents: read` at the top; the only write scope, `id-token: write`, is granted to the Scorecard job alone.                                                                                                  |
| Pinned-Dependencies    | Actions are pinned to full commit SHAs with the version as a comment; npm packages are pinned by the lockfile. The `postgres:16` service image is pinned by tag only.                                                                          |
| Dependency-Update-Tool | [`.github/dependabot.yml`](../../.github/dependabot.yml): npm, GitHub Actions and Compose images, weekly, minor and patch grouped, at most 5 open pull requests each.                                                                          |
| SAST                   | CodeQL through GitHub's default setup (`javascript-typescript` and `actions`), a repository setting described in [enable the repository's security features](../how-to/enable-repository-security-features.md); type-aware ESLint in the gate. |
| Security-Policy        | [SECURITY.md](../../SECURITY.md) with private vulnerability reporting.                                                                                                                                                                         |
| License                | [LICENSE](../../LICENSE) (MIT).                                                                                                                                                                                                                |
| CI-Tests               | [`ci.yml`](../../.github/workflows/ci.yml) runs the gate on pushes to `main` and on pull requests.                                                                                                                                             |
| Dangerous-Workflow     | No `pull_request_target`; no untrusted input in `run:` scripts; `actions/checkout` with `persist-credentials: false`.                                                                                                                          |
| SBOM                   | The `supply-chain` job writes a CycloneDX SBOM with `npm sbom` and keeps it as an artifact for 30 days.                                                                                                                                        |
| Binary-Artifacts       | The only binaries are the four screenshots in `docs/assets/`.                                                                                                                                                                                  |

[`dependency-review.yml`](../../.github/workflows/dependency-review.yml) fails pull requests that add dependencies with high or critical advisories. [`scorecard.yml`](../../.github/workflows/scorecard.yml) publishes its results to the OpenSSF viewer and keeps the SARIF as an artifact; it does not upload it to code analysis, because that needs a job permission the workflow does not grant.

## `npm audit` status

On 2026-10-17, against the committed lockfile:

| Command                | Result                                               |
| ---------------------- | ---------------------------------------------------- |
| `npm audit --omit=dev` | found 0 vulnerabilities (blocking in CI)             |
| `npm audit`            | 10 high severity vulnerabilities (report only in CI) |

All ten are one advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): stack exhaustion in `braces` through deeply nested patterns (CWE-674, affected range `<=3.0.3`). npm counts every package on the path:

```text
@submission-wizard/web (devDependency) → @graphql-codegen/cli@7.4.6
  → micromatch@4.0.8 → braces@3.0.3
  (also via @graphql-tools/*-loader → globby → fast-glob → micromatch)
```

### Accepted risk

- **No fixed release exists.** `braces` 3.0.3 is the latest and is in the affected range. `npm audit fix --force` would downgrade `@graphql-codegen/cli` four major versions, which fixes nothing.
- **Development only.** The code generator turns `server/schema.graphql` and `web/src/api/operations.ts` into types on a developer machine or in CI. It is not in `npm ci --omit=dev`, the browser bundle or the API process.
- **No attacker-controlled input.** The vulnerable code expands glob patterns, and the only patterns it sees are the fixed ones in [`web/codegen.ts`](../../web/codegen.ts).
- **Review.** Dependabot proposes an update when one exists, and the report-only audit keeps the advisory visible in every CI run.
