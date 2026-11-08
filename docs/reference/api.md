# API reference

GraphQL, built code-first with Pothos in [`server/src/graphql/schema.ts`](../../server/src/graphql/schema.ts). Every schema element has a description, and [`server/tests/schema.test.ts`](../../server/tests/schema.test.ts) fails if one is missing or the committed SDL is stale.

## Exploring the schema

- **SDL:** [`server/schema.graphql`](../../server/schema.graphql), sorted, with all descriptions. Regenerate with `npm run schema:dump --workspace @submission-wizard/server`, then `npm run codegen` for the web types.
- **Introspection** works in development and is refused when `NODE_ENV=production`.
- **GraphiQL is off,** because it sends GET requests without the CSRF header. Any client that can POST with a custom header works:

```bash
curl -s http://localhost:4400/graphql \
  -H 'content-type: application/json' -H 'x-submission-wizard-csrf: 1' \
  --data '{"query":"{ press { name timeZone today } }"}'
```

## Transport

| Path               | Method      | Purpose                                                                                                                                                                                                              |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/graphql`         | `POST` only | GraphQL. JSON, or `multipart/form-data` per the GraphQL multipart request specification for uploads. Needs the `x-submission-wizard-csrf` header (any value); without it: 400. `GET`/`HEAD`: 405 with `Allow: POST`. |
| `/manuscripts/:id` | `GET`       | Downloads a manuscript to its author or to an editor (if not a draft); anyone else gets 404.                                                                                                                         |
| `/healthz`         | `GET`       | `ok` when the database answers, else 503 `database unavailable`.                                                                                                                                                     |

- A request whose `Origin` is not in `ALLOWED_ORIGINS` gets 403 on every path and method. CORS allows only those origins, with credentials, for `POST` with `content-type` and `x-submission-wizard-csrf`.
- Bodies over 5 MB plus 64 KB are refused before they are buffered (413 when the length is declared).
- The session is an HTTP-only cookie, `submission_wizard_session`, set by `signIn`.
- Every response carries the [security headers](../security/threat-model.md#http-security-headers).
- An id that is not a UUID is treated as not found everywhere (`NotFoundError`, null or 404), before any query runs.

## Operations

Auth: **public** works without a session; **signed in** needs any session; **author** / **editor** need that role. "Signed in" fields return null or an empty list for anonymous callers instead of an error, except where a result union lists `NotSignedInError`. `User.email` is null unless the viewer is that user, or an editor looking at an author.

### Queries

| Field                                 | Auth      | Purpose                                                                              |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| `me`                                  | public    | The signed-in user, or null.                                                         |
| `press`                               | public    | The press's name, time zone and `today` there.                                       |
| `mySubmissions`                       | signed in | The viewer's own submissions, most recently changed first.                           |
| `submission(id)`                      | signed in | One submission the viewer may see, or null (not found and not visible are the same). |
| `reviewQueue(statuses, first, after)` | editor    | A keyset page of non-draft submissions; see [Pagination](#pagination). Result union. |
| `notifications`                       | signed in | The viewer's 50 most recent messages.                                                |

### Mutations

| Field                                 | Auth            | Purpose                                                                                     | Error members (besides the success type)                         |
| ------------------------------------- | --------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `signIn(email, password)`             | public          | Signs in and sets the cookie. Rate-limited per client, per client and email, and per email. | `InvalidCredentialsError`, `ValidationError` (too many attempts) |
| `signOut`                             | public          | Revokes every session of the viewer and clears the cookie. Returns `true`.                  | none (plain `Boolean`)                                           |
| `markNotificationsRead`               | signed in       | Marks all messages read; returns how many changed.                                          | `NotSignedInError`                                               |
| `createDraft(input)`                  | author          | Starts a draft from any subset of fields.                                                   | submission errors*                                               |
| `saveDraft(id, version, input)`       | author          | Saves a draft, or the editable fields of an accepted submission.                            | submission errors*, `LockedFieldError`                           |
| `uploadManuscript(id, version, file)` | author          | Attaches a PDF or UTF-8 text file (≤ 5 MB) to a draft.                                      | submission errors*, `UploadRejectedError`                        |
| `submitSubmission(id, version)`       | author          | Sends a complete draft to the press.                                                        | submission errors*, `IncompleteSubmissionError`                  |
| `withdrawSubmission(id, version)`     | author          | Takes an unclaimed submission back to draft.                                                | submission errors*                                               |
| `reviseSubmission(id, version?)`      | author          | Turns a declined submission back into a draft.                                              | submission errors*                                               |
| `duplicateSubmission(id)`             | author          | Starts a new draft from one of the author's submissions (text only).                        | submission errors*                                               |
| `claimSubmission(id, version?)`       | editor          | Takes a waiting submission into review.                                                     | submission errors*                                               |
| `acceptSubmission(id, releaseDate)`   | claiming editor | Accepts with a release date; messages the author.                                           | submission errors*                                               |
| `declineSubmission(id, note)`         | claiming editor | Declines with a note; messages the author.                                                  | submission errors*                                               |

\* **Submission errors:** `NotSignedInError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError`, `InvalidTransitionError`.

## Error model

Expected failures are **values, not GraphQL errors** ([ADR 0002](../adr/0002-errors-as-result-unions.md)). A field that can fail returns a union named `<Parent><Field>Result` whose members are `<Parent><Field>Success { data }` and the error types. Every error type implements:

```graphql
interface Error {
  message: String! # a sentence for the person using the app
}
```

| Type                        | Extra fields                    | Meaning                                                                               |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `NotSignedInError`          |                                 | No session.                                                                           |
| `ForbiddenError`            |                                 | Wrong role.                                                                           |
| `NotFoundError`             |                                 | Missing, or not visible to the viewer.                                                |
| `InvalidCredentialsError`   |                                 | Email and password do not match.                                                      |
| `ValidationError`           | `problems { field message }`    | Input failed the shared rules, a cursor is malformed, or too many sign-in attempts.   |
| `ConflictError`             | `currentVersion`                | The stored version differs from the one sent.                                         |
| `InvalidTransitionError`    | `status`                        | The workflow does not allow the move (wrong status, role, or another editor's claim). |
| `LockedFieldError`          | `fields`                        | An accepted submission's locked fields were touched.                                  |
| `IncompleteSubmissionError` | `issues { step field message }` | The draft is not ready to submit.                                                     |
| `UploadRejectedError`       |                                 | Empty, larger than 5 MB, or neither PDF nor UTF-8 text.                               |

Clients switch on `__typename`, spreading `... on ConflictError { currentVersion }` and similar members, with `... on Error { message }` as the fallback. Unexpected errors are masked by Yoga (`Unexpected error.`) and logged server-side; they never carry stack traces or SQL to the client.

## Pagination

`reviewQueue` uses keyset pagination ([ADR 0005](../adr/0005-keyset-pagination-for-the-queue.md)):

- Order: `submitted_at DESC, id DESC`.
- `first`: page size, default 10, clamped to 1–50.
- `after`: the previous page's `pageInfo.endCursor`. The cursor is opaque (base64url of the last `submitted_at`, with microseconds, and `id`). A malformed cursor returns `ValidationError` on field `after`.
- `pageInfo.hasNextPage` says whether older records follow; `endCursor` is null for an empty page.
- `statuses`: omitted or empty means every status except `DRAFT`; `DRAFT` is never returned.

## Versioning

The API follows the project's [semantic version](../../CHANGELOG.md). Removing or renaming a field is a breaking change; adding fields, types or union members is not, so clients should treat an unknown `__typename` as a generic error.
