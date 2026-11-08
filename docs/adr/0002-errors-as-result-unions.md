---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# Errors as result unions

## Context and Problem Statement

Most mutations can fail in ways the person should see and the client should handle: a conflict needs the current version, a validation failure needs per-field problems, an incomplete draft needs its checklist. GraphQL's top-level `errors` array carries these as strings outside the type system.

## Decision Drivers

- Clients switch on the kind of failure, with typed extra data.
- The SDL lists every failure a field can return.
- Unexpected errors reveal nothing.

## Considered Options

- Result unions from the Pothos errors plugin
- Top-level `errors` with extension codes
- A status field on every payload

## Decision Outcome

Chosen option: result unions. Domain services throw specific classes from `server/src/domain/errors.ts`; the errors plugin registers each as an object type implementing `Error` and wraps each field in a `<Parent><Field>Result` union. Anything else is masked by Yoga as `Unexpected error.`

### Consequences

- Good, because a client writes `... on ConflictError { currentVersion }`, and code generation types it.
- Bad, because queries spread each member they handle, and the success type wraps the payload in `data`.

### Confirmation

API tests assert `__typename` throughout `server/tests/api.test.ts`; "masks unexpected errors: the client gets a generic message and the detail is only logged" covers the other side. `server/tests/schema.test.ts` checks that generated unions are described.

## Pros and Cons of the Options

- **Result unions:** typed and visible in the SDL; more verbose queries.
- **Extension codes:** the GraphQL default, but codes are untyped strings and error data has no schema.
- **Status field:** simple, but error-specific data such as `currentVersion` has no typed home.

## More Information

[API error model](../reference/api.md#error-model).
