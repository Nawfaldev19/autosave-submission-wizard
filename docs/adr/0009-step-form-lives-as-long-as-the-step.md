---
status: accepted
date: 2026-10-17
decision-makers: project maintainer
---

# A wizard step's form lives as long as the step

## Context and Problem Statement

Keying the step form by the submission's version remounted it on every write. An upload increments the version, so it wiped a word count typed but not yet saved; a conflict wiped what the author had just typed.

## Decision Drivers

- Edits survive uploads and conflicts.
- Untouched fields follow the saved draft.
- The author decides when to drop their edits.

## Considered Options

- Key the form by step and a reload counter, and pass saved values with `keepDirtyValues`
- Key the form by version
- Never update the form from the server

## Decision Outcome

Chosen option: step and reload counter. The step's container is keyed by the step and by `formSeed`, which only **Reload latest version** increments. Saved values reach React Hook Form as `values` with `keepDirtyValues`, so untouched fields take newer values and edited ones stay. Back navigates without saving, through the unsaved-changes guard.

### Consequences

- Good, because edits survive uploads and conflicts until the author chooses to reload.
- Bad, because if a refetch brings a newer version while the author is editing, their next save, made against that newer version, replaces the fields they edited without showing them what changed.

### Confirmation

Component tests "keeps an unsaved word count through an upload, announces it, and saves the new version" and "keeps the typed edits when another tab saved first, until the author chooses to reload".

## Pros and Cons of the Options

- **Step and reload counter:** the form survives changes on the same step; an edited field can be saved over a version it did not see.
- **Version key:** always shows the latest save, and wipes typed work on every upload or conflict.
- **Never update:** edits are never touched, and uploads and reloads show stale values.

## More Information

[Wizard and concurrency](../explanation/wizard-and-concurrency.md).
