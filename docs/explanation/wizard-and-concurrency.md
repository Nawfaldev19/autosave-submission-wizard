# The wizard and concurrency

The hardest part of Submission Wizard: a multi-step form that saves as the author moves on, never loses typed work, and never lets a stale tab overwrite a newer save. Decisions: [ADR 0003](../adr/0003-optimistic-concurrency-with-a-version-column.md) (version column) and [ADR 0009](../adr/0009-step-form-lives-as-long-as-the-step.md) (form lifetime). Code: [`Wizard.tsx`](../../web/src/wizard/Wizard.tsx), [`useStepForm.ts`](../../web/src/wizard/useStepForm.ts), `saveDraft` and `updateWithVersion` in [`submissions.ts`](../../server/src/domain/submissions.ts).

## Version numbers on every write

Each submission has a `version`. Saving sends the version the author started from, and the server writes with one statement:

```sql
UPDATE submissions SET …, version = version + 1, updated_at = now()
WHERE id = $id AND author_id = $author AND version = $version
RETURNING *
```

- **One record updated:** the save wins and the author gets the new version.
- **No match** means either "not yours" (→ `NotFoundError`) or "someone saved first" (→ `ConflictError { currentVersion }`). A second `SELECT` tells them apart, without revealing anything about other people's submissions.
- **Status changes** (`submit`, `withdraw`) also accept the version and run under a record lock (`SELECT … FOR UPDATE`), so a submit cannot slip past a save made in another tab.
- **Uploads** use the same versioned update inside their transaction; a conflict removes the file just written, and the step says the file was not uploaded.

## Saving a step

```mermaid
sequenceDiagram
  actor A as Author
  participant T1 as Tab 1
  participant T2 as Tab 2
  participant API as API
  participant DB as Postgres
  Note over T1,T2: both opened the draft at version 3
  A->>T1: edit title, Save and continue
  T1->>API: saveDraft(version: 3)
  API->>DB: UPDATE … WHERE version = 3
  DB-->>API: version 4
  API-->>T1: Success, version 4 → step 2
  A->>T2: edit title, Save and continue
  T2->>API: saveDraft(version: 3)
  API->>DB: UPDATE … WHERE version = 3
  DB-->>API: 0 records
  API-->>T2: ConflictError { currentVersion: 4 }
  T2-->>A: alert: changed since you opened it; your edits are still in the form
  A->>T2: Reload latest version
  T2->>API: submission(id), network-only
  API-->>T2: version 4
  T2->>T2: restart the step form from version 4 (formSeed + 1)
```

The end-to-end test "a stale tab cannot overwrite a newer save" drives exactly this with two real tabs.

## How the step form keeps edits

- **One route for new and saved drafts.** `/submissions/:key/edit/:step` serves both `new` and a real id. The first save navigates to the id with `replace`, and because the route is the same, the wizard does not remount.
- **The form lives as long as the step.** The step's container is keyed by `step` and a `formSeed` counter that only **Reload latest version** increments. Saves and uploads on the same step do not remount the form.
- **Saved values follow, edits stay.** `useStepForm` passes the saved values to React Hook Form as `values` with `resetOptions: { keepDirtyValues: true }`. When a refetch or an upload brings a newer submission, untouched fields take the new values and edited fields keep their edits. That is why an unsaved word count survives an upload.
- **The newest copy wins.** The wizard keeps the last mutation result and compares its version with the query's, so a slower network answer cannot replace a newer save.
- **Messages belong to their step.** Server errors and the conflict notice are cleared when the step changes.
- **Fix links focus once.** `?focus=<field>` focuses that field on arrival only; later re-renders do not pull focus back.
- **An ended session keeps the edits.** Sessions last 12 hours and are not renewed. A save refused with `NotSignedInError` leaves the form as it is, and the notice links to the sign-in page in a new tab; the cookie it sets is shared, so saving again in the first tab works.

## The unsaved-changes guard

- React Router's `useBlocker` blocks in-app navigation (links, the step's Back button, the header's Sign out, which navigates to `/sign-out` first) while the form is dirty.
- `window.onbeforeunload` covers closing or reloading the tab.
- The question is a modal `<dialog role="alertdialog">` (`ConfirmDialog`): focus stays inside, Escape means "stay", and **Leave without saving** proceeds.
- The wizard's own navigation after a successful save sets a ref that lets it through, since nothing is left unsaved.

## Known trade-off

When a refetch brings a newer version while the author is editing (for example the network answer arriving after the cached one), the fields they have edited keep their edits, and the next save, made against that newer version, replaces just those fields. Untouched fields have already taken the newer values. This is deliberate ([ADR 0009](../adr/0009-step-form-lives-as-long-as-the-step.md)): the alternative wiped typed work.

## Tests

The tests for this page are listed under F-02, F-04 and F-05 in the [traceability matrix](../testing/traceability.md#features).
