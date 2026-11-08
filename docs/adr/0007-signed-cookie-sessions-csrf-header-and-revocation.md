---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# Signed-cookie sessions, a CSRF header, and revocation by time

## Context and Problem Statement

The app and the API share an origin through a proxy. A token in `localStorage` is readable by any injected script. A cookie is sent by the browser on cross-site requests too, and multipart uploads are "simple" requests that a cross-site form can make. A stateless token also stays valid after sign-out unless the server keeps some state.

## Decision Drivers

- No token handling in JavaScript.
- Cross-site forms and cross-site `fetch` can neither act nor read.
- A copied token stops working when its owner signs out, without a query per request beyond the user lookup that already happens.

## Considered Options

- An HMAC-signed HTTP-only cookie, a required custom header, and a per-user "valid after" time
- Bearer tokens in `localStorage`
- A server-side session table with a synchroniser CSRF token

## Decision Outcome

Chosen option: the signed cookie with a custom header and revocation by time.

- The session is an HMAC-SHA256 signed token holding a user id and an expiry (12 hours), in an HTTP-only, `SameSite=Lax` cookie, `Secure` by default in production.
- Every POST must carry `x-submission-wizard-csrf`. A cross-site form cannot add it, and a cross-site `fetch` cannot add it without a preflight, which CORS approves only for `ALLOWED_ORIGINS`. Any other `Origin` is refused outright, and GraphQL is not served over GET, so a `Lax` cookie on a cross-site GET reads nothing.
- Signing out sets `users.sessions_valid_after` to the current time; a token issued before it is ignored. The issue time is derived from the expiry, so the token needs no extra field.

### Consequences

- Good, because scripts never see the token, and the CORS configuration is a short allow-list.
- Good, because revocation costs nothing extra: each request already loads the user.
- Bad, because signing out ends every session of the account, on every device; ending one session would need a session table.
- Bad, because sessions are not renewed, so a long sitting can outlast them; the wizard keeps the typed edits and offers to sign in again in a new tab.

### Confirmation

API tests "refuses POSTs without the CSRF header or from foreign origins", "serves GraphQL over POST only, and lets only the app’s own origin read responses", "sets a signed, HTTP-only, SameSite cookie and clears it on sign-out" and "signing out revokes the session token itself, not just the cookie"; `server/tests/auth.test.ts`.

## Pros and Cons of the Options

- **Signed cookie, header, valid-after time:** no script access, CSRF needs CORS approval, no session store; revocation is all-or-nothing.
- **Bearer tokens in `localStorage`:** no CSRF, but one injected script steals the session.
- **Session table and synchroniser token:** single sessions can be ended; costs a table, a lookup and token plumbing in every form.

## More Information

OWASP Cross-Site Request Forgery Prevention and Session Management cheat sheets. [Threat model](../security/threat-model.md).
