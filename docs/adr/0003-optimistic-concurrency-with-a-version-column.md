---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# Optimistic concurrency with a version column

## Context and Problem Statement

Authors leave tabs open for days. If the last write wins, a stale tab silently undoes a newer save. Editing locks would outlive abandoned tabs.

## Decision Drivers

- No save silently overwrites a newer one.
- Nothing to clean up when a tab is abandoned.
- The author keeps what they typed when a conflict happens.

## Considered Options

- A `version` column matched in the `UPDATE`
- Last write wins
- Pessimistic editing locks with expiry

## Decision Outcome

Chosen option: the version column. Every write sends the version the client started from. One `UPDATE … WHERE id AND author_id AND version` either succeeds and increments the version, or matches nothing, after which a second read tells "not yours" (`NotFoundError`) from "changed" (`ConflictError { currentVersion }`). Status changes accept the version too, under a record lock.

### Consequences

- Good, because a conflict is detected by the same statement that writes, with no lock to expire.
- Bad, because the client carries the version and the interface must offer an explicit reload.

### Confirmation

API test "refuses a stale version with the current one, so the client can reload"; component test "keeps the typed edits when another tab saved first, until the author chooses to reload"; end-to-end test "a stale tab cannot overwrite a newer save".

## Pros and Cons of the Options

- **Version column:** one statement detects the conflict; the client must send the version back.
- **Last write wins:** no code at all, and work disappears without a trace.
- **Editing locks:** conflicts cannot happen, but a closed laptop holds the lock until it expires.

## More Information

Pattern: Optimistic Offline Lock (Fowler, _Patterns of Enterprise Application Architecture_). Walk-through: [wizard and concurrency](../explanation/wizard-and-concurrency.md).
