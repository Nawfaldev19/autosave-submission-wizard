# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-10-17

The first release. Each feature is described in the [feature catalogue](docs/reference/features.md).

### Added

- **Authoring:** a five-step submission wizard that saves on advance and resumes later ([F-02](docs/reference/features.md#f-02-five-step-submission-wizard)), a readiness checklist with Fix links ([F-03](docs/reference/features.md#f-03-readiness-checklist-and-fix-links)), conflict recovery that keeps typed edits ([F-04](docs/reference/features.md#f-04-conflict-recovery-for-stale-tabs)), an unsaved-changes guard ([F-05](docs/reference/features.md#f-05-unsaved-changes-guard)) and manuscript uploads checked by content ([F-06](docs/reference/features.md#f-06-manuscript-upload-and-protected-download)).
- **Workflow:** submit, withdraw (after a confirmation) and revise ([F-07](docs/reference/features.md#f-07-submit-withdraw-and-revise)); the author's list, copies and an inbox with read state ([F-08](docs/reference/features.md#f-08-submissions-list-copies-and-inbox)); locked fields after acceptance ([F-09](docs/reference/features.md#f-09-accepted-submissions-with-locked-fields)).
- **Editing:** a review queue with status filters and keyset pages ([F-10](docs/reference/features.md#f-10-review-queue-with-filters-and-keyset-pages)); claim, accept with a release date, or decline with a note ([F-11](docs/reference/features.md#f-11-claim-accept-or-decline)).
- **Shell:** sign-in and sign-out ([F-01](docs/reference/features.md#f-01-sign-in-sessions-and-sign-out)); themes, focus management, one polite live region and a layout from 320px up ([F-12](docs/reference/features.md#f-12-app-shell-and-responsive-layout)).
- **API:** GraphQL Yoga with a code-first Pothos schema in which every element is described, and expected failures returned as typed result unions.
- **Data:** PostgreSQL with plain SQL migrations, check constraints for the workflow, and fictional seed data.
- **Tooling:** unit, integration, browser component and end-to-end suites with coverage thresholds; GitHub Actions for the gate, dependency review and OpenSSF Scorecard; Dependabot; Docker Compose.

### Security

- Sessions in HMAC-signed HTTP-only cookies, revoked server-side on sign-out; scrypt passwords with a decoy hash; sign-in limits per client, per client and email, and per email.
- A required CSRF header, a CORS allow-list, POST-only GraphQL, body limits, and security headers on every response ([threat model](docs/security/threat-model.md#http-security-headers)).
- Configuration parsed and checked at start-up; production refuses a missing, short or example `SESSION_SECRET`.
- Email addresses are visible only to their owner, and authors' addresses to editors.
