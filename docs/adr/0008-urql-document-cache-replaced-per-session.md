---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# urql's document cache, replaced when the session changes

## Context and Problem Statement

The app is form-heavy, with few entities shown on several screens at once. A cache is still needed so that Back is instant. Whatever cache is used must never show one person's results to the next person in the same browser tab.

## Decision Drivers

- Little configuration, predictable freshness after edits.
- Nothing one person loaded is shown to the next.
- Sign-out must pass through the wizard's unsaved-changes guard.

## Considered Options

- urql's document cache with typename invalidation, and a new client on every change of session
- A normalised cache (Graphcache or Apollo), cleared by hand on sign-out
- No cache

## Decision Outcome

Chosen option: the document cache, with the whole client replaced. Pages that must be fresh use `cache-and-network`; a mutation result containing a `Submission` invalidates cached queries that include one. The client lives in React state in `ClientProvider`; signing in, and the `/sign-out` route once `signOut` succeeds, call `useResetClient()`, which creates a new one.

### Consequences

- Good, because there is almost nothing to configure, and no cached page survives a change of person, including pages reached with Back.
- Good, because sign-out is a route, so the unsaved-changes guard asks first.
- Bad, because some refetches happen that a normalised cache would avoid, and every query runs again after sign-in.

### Confirmation

Component tests "signs out with a brand-new client, so nothing cached survives", "signs in with a demo account and starts a fresh client" and "shows unread messages, links each to its submission, and marks them read"; end-to-end test "signing out and in as someone else shows only their work".

## Pros and Cons of the Options

- **Document cache, new client:** small and predictable; refetches more.
- **Normalised cache:** entities update everywhere at once, but needs keys and updaters, and clearing it selectively is easy to get wrong.
- **No cache:** never stale; every navigation waits for the network.

## More Information

urql documentation: document caching.
