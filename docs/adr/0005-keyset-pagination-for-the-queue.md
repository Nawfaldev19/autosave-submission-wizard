---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# Keyset pagination for the queue

## Context and Problem Statement

New submissions arrive while an editor pages through the queue. With offsets, every arrival shifts later pages by one, so an item is shown twice or skipped.

## Decision Drivers

- No item repeats or goes missing as new work arrives.
- Each page is an index range read with no sort.

## Considered Options

- Keyset cursors on `(submitted_at, id)`
- Offset and limit
- Load the whole queue

## Decision Outcome

Chosen option: keyset cursors. The cursor holds the last `(submitted_at, id)`, and the next page asks for records strictly before that pair, in the order of a matching index. The cursor's time is formatted by Postgres with microseconds, because `timestamptz` keeps them and a JavaScript `Date` does not; a millisecond cursor skipped records whose time was written by `now()`.

### Consequences

- Good, because pages are stable at any depth and each is an index range read: a one-status filter uses `(status, submitted_at, id)`, several statuses use the partial `(submitted_at, id)` index from migration `0003`.
- Bad, because there is no "jump to page 7", which an editors' queue does not need.
- Bad, because a multi-status filter reads past unwanted statuses when the wanted ones are rare.

### Confirmation

API tests "pages newest first with stable keyset cursors" and "pages correctly through equal and microsecond times written by SQL".

## Pros and Cons of the Options

- **Keyset:** stable and cheap; next-page navigation only.
- **Offset:** any page is addressable; inserts shift every later page.
- **Whole queue:** simple; grows without bound.

## More Information

[Pagination contract](../reference/api.md#pagination).
