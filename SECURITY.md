# Security policy

Submission Wizard is a personal demo project, maintained on a best-effort basis. Security reports are welcome and taken seriously.

## Supported versions

| Version | Supported                                      |
| ------- | ---------------------------------------------- |
| 1.0.x   | Yes (the latest on `main`)                     |
| Older   | No; please check against the latest code first |

## Reporting a vulnerability

Please **do not open a public issue**. Use the repository's **Security → Report a vulnerability** form ([private vulnerability reporting](../../security/advisories/new)).

Include:

- the affected commit and component (`shared/`, `server/`, `web/`, workflows);
- steps to reproduce from a fresh `npm run db:setup`, with the demo account used;
- what an attacker gains, and any proof-of-concept request or file;
- whether the issue is already public.

Use only the fictional demo data; never include real personal data.

## What to expect

These are goals for a personal project, not commitments:

- acknowledgement within 5 working days;
- an initial assessment (confirmed or not, and how severe) within 10 working days;
- a fix and disclosure coordinated with you: a fix on `main`, a CHANGELOG entry under "Security", and a GitHub security advisory crediting you if you wish.

## Scope

In scope: everything in this repository, from the GraphQL API, web app and shared rules to the SQL migrations, Docker Compose file and workflows.

Out of scope:

- the published demo password and seeded accounts, which are fictional and public by design;
- findings that rely on development settings in a context that claims to be production (introspection, the development session secret, the Vite dev server without a CSP);
- limitations already listed in the [threat model](docs/security/threat-model.md) and the [ASVS mapping](docs/security/asvs-mapping.md), such as MFA, malware checking of uploads or TLS;
- third-party vulnerabilities with no effect here (report those upstream; see [supply chain](docs/security/supply-chain.md));
- denial of service by volume, and social engineering.

## Safe harbour

Good-faith research that follows this policy, uses only your own local instance and the demo data, and avoids privacy violations and disruption will not be pursued or reported by the maintainer.
