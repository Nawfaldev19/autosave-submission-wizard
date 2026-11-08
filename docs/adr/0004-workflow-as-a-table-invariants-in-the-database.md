---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# The workflow as a table, the invariants in the database

## Context and Problem Statement

When each mutation checks status on its own, records such as "accepted but never submitted" or "in review with no editor" appear sooner or later. Two editors pressing Claim at the same moment must not both win.

## Decision Drivers

- One place to read and test every allowed move.
- Concurrent moves on one submission are serialised.
- The invariants hold even for a future code path that skips the service.

## Considered Options

- A transition table, one `transition()` service and SQL check constraints
- Status checks inside each mutation
- A state-machine library

## Decision Outcome

Chosen option: the table, the service and the constraints. `TRANSITIONS` in `shared/src/workflow.ts` maps each action to its source status, target status and role. `transition()` locks the record with `SELECT … FOR UPDATE`, asks the table, applies the action's own rules (readiness, release date, note, claiming editor) and writes any notification in the same transaction. Check constraints (`review_has_editor`, `accepted_has_release_date`, `declined_has_note`, `submitted_have_timestamp`) repeat the invariants.

### Consequences

- Good, because an exhaustive test can enumerate every status, action and role.
- Good, because a raw SQL update that breaks an invariant is refused.
- Bad, because the table and the constraints are kept consistent by hand, and action-specific rules still live in code (`changesFor`).

### Confirmation

Unit test "allows exactly the transitions in the table, for the right role"; API tests "lets exactly one of two editors claiming at once win" and "keeps database invariants even if code skips the service".

## Pros and Cons of the Options

- **Table, service, constraints:** rules as data with the database as a backstop; two artefacts to keep aligned.
- **Per-mutation checks:** self-contained, but the rules scatter and drift.
- **State-machine library:** visualisation for free, at the price of a dependency for six moves.

## More Information

State diagram: [architecture](../explanation/architecture.md#submit-claim-decide). Constraints: [data model](../reference/data-model.md).
