# Architecture decision records

Each file records one decision with the options that were weighed, in the [MADR 4.0.0](https://adr.github.io/madr/) format. Numbers are stable: a superseded record keeps its file and links to its replacement.

| ADR                                                               | Decision                                                      | Status   |
| ----------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| [0001](0001-one-language-and-shared-rules.md)                     | One language and shared rules                                 | accepted |
| [0002](0002-errors-as-result-unions.md)                           | Errors as result unions                                       | accepted |
| [0003](0003-optimistic-concurrency-with-a-version-column.md)      | Optimistic concurrency with a version column                  | accepted |
| [0004](0004-workflow-as-a-table-invariants-in-the-database.md)    | The workflow as a table, the invariants in the database       | accepted |
| [0005](0005-keyset-pagination-for-the-queue.md)                   | Keyset pagination for the queue                               | accepted |
| [0006](0006-sniff-uploads-store-under-random-keys.md)             | Sniff uploads, store them under random keys                   | accepted |
| [0007](0007-signed-cookie-sessions-csrf-header-and-revocation.md) | Signed-cookie sessions, a CSRF header, and revocation by time | accepted |
| [0008](0008-urql-document-cache-replaced-per-session.md)          | urql's document cache, replaced when the session changes      | accepted |
| [0009](0009-step-form-lives-as-long-as-the-step.md)               | A wizard step's form lives as long as the step                | accepted |

Smaller choices are recorded where they apply: plain SQL migrations with Drizzle for queries in the [data model](../reference/data-model.md), the security headers in the [threat model](../security/threat-model.md#http-security-headers), and documentation rules in [CONTRIBUTING.md](../../CONTRIBUTING.md).

To add a record, copy the headings of an existing one, take the next number, and add it here in the same pull request as the change.
