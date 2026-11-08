# Feature catalogue

What each feature does, why, where its code lives and how it works. The README uses the same IDs; tests are listed in the [traceability matrix](../testing/traceability.md#features).

## F-01 Sign-in, sessions and sign-out

- **What.** Sign in with email and password, or with one click on a demo account; sign out from the header.
- **Why.** Authors and editors see different things, and a shared browser must not show one person's data to the next.
- **Where.** [`domain/auth.ts`](../../server/src/domain/auth.ts), [`auth/session.ts`](../../server/src/auth/session.ts), [`auth/password.ts`](../../server/src/auth/password.ts), [`domain/rateLimit.ts`](../../server/src/domain/rateLimit.ts), `viewerFor` and `clientAddress` in [`http/app.ts`](../../server/src/http/app.ts); [`SignInLanding.tsx`](../../web/src/routes/SignInLanding.tsx), [`SignOut.tsx`](../../web/src/routes/SignOut.tsx), [`ClientProvider.tsx`](../../web/src/api/ClientProvider.tsx).
- **How it works.** scrypt checks the password (a decoy hash for unknown emails) under three rate limits: per client, per client and email, and per email. An HMAC-signed token goes in an HTTP-only `SameSite=Lax` cookie. Sign-out moves `sessions_valid_after` forward, revoking older tokens, and replaces the urql client; if it fails, the page says the person is still signed in.
- **ADRs.** [0007](../adr/0007-signed-cookie-sessions-csrf-header-and-revocation.md), [0008](../adr/0008-urql-document-cache-replaced-per-session.md).
- **Accessibility.** Labelled inputs; failures are alerts.

## F-02 Five-step submission wizard

- **What.** Basics, Manuscript, Schedule, About you, Review and submit. Each step saves when the author moves on; a draft can be resumed later.
- **Why.** Authors work over several sittings; saving per step rather than per keystroke keeps writes meaningful.
- **Where.** [`Wizard.tsx`](../../web/src/wizard/Wizard.tsx), [`steps.tsx`](../../web/src/wizard/steps.tsx), [`useStepForm.ts`](../../web/src/wizard/useStepForm.ts); rules in [`shared/src/submission.ts`](../../shared/src/submission.ts); `createDraft` and `saveDraft` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts).
- **How it works.** Each step is a React Hook Form bound to its shared Zod schema; the server parses the strict `draftPatchSchema` again. The first save swaps `new` for the draft's id on the same route, so nothing remounts. If the session has ended, the edits stay and the notice links to signing in again in a new tab.
- **ADRs.** [0001](../adr/0001-one-language-and-shared-rules.md), [0009](../adr/0009-step-form-lives-as-long-as-the-step.md).
- **Accessibility.** A stepper `nav` with `aria-current="step"` and hidden "(complete)" text; errors tied to inputs with `aria-describedby` and `aria-invalid`; the page title names the step.

## F-03 Readiness checklist and Fix links

- **What.** The review step lists everything still missing, each with a Fix link that opens the right step with the field focused.
- **Why.** The author sees exactly what blocks submission, and the server refuses an incomplete submission with the same list.
- **Where.** `readiness()` in [`shared/src/submission.ts`](../../shared/src/submission.ts), [`ReviewStep.tsx`](../../web/src/wizard/ReviewStep.tsx), [`labels.ts`](../../web/src/wizard/labels.ts), focus handling in [`useStepForm.ts`](../../web/src/wizard/useStepForm.ts).
- **How it works.** `Submission.readiness` runs the shared function on the stored draft; each issue's link adds `?focus=<field>`, which the step focuses once.
- **ADRs.** [0001](../adr/0001-one-language-and-shared-rules.md).
- **Accessibility.** Links read "Fix Short biography", with human labels rather than field names.

## F-04 Conflict recovery for stale tabs

- **What.** A save from a tab that is behind is refused; the author is told, the typed edits stay in the form, and the author chooses when to reload.
- **Why.** With last-write-wins, an author with two tabs open would lose work without knowing.
- **Where.** `updateWithVersion` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), `ConflictError` in [`errors.ts`](../../server/src/domain/errors.ts), `reload` in [`Wizard.tsx`](../../web/src/wizard/Wizard.tsx).
- **How it works.** Every save sends its starting version; one `UPDATE … WHERE id AND author_id AND version` wins or answers `ConflictError { currentVersion }`. A refused upload is reported as not uploaded. **Reload latest version** restarts the step form from the saved draft.
- **ADRs.** [0003](../adr/0003-optimistic-concurrency-with-a-version-column.md), [0009](../adr/0009-step-form-lives-as-long-as-the-step.md).
- **Accessibility.** The conflict notice is an alert, with the reload button inside it.

## F-05 Unsaved-changes guard

- **What.** Leaving a step with unsaved edits, by an in-app link, Back, signing out or closing the tab, asks first.
- **Why.** Saving happens on advance, so any other way out could drop typed work.
- **Where.** `useBlocker` and `window.onbeforeunload` in [`Wizard.tsx`](../../web/src/wizard/Wizard.tsx), [`ConfirmDialog.tsx`](../../web/src/components/ConfirmDialog.tsx), the `/sign-out` route in [`SignOut.tsx`](../../web/src/routes/SignOut.tsx).
- **How it works.** React Router's blocker covers in-app navigation and the unload prompt covers closing the tab; navigation after a successful save passes through.
- **ADRs.** [0008](../adr/0008-urql-document-cache-replaced-per-session.md), [0009](../adr/0009-step-form-lives-as-long-as-the-step.md).
- **Accessibility.** A modal `<dialog>` with `role="alertdialog"`, labelled and described; focus stays inside; Escape means "stay".

## F-06 Manuscript upload and protected download

- **What.** Upload a PDF or UTF-8 text manuscript of up to 5 MB on step 2, and download it later from the submission pages.
- **Why.** Unpublished manuscripts are the press's most sensitive data, and uploads are its riskiest input.
- **Where.** [`shared/src/uploads.ts`](../../shared/src/uploads.ts), `attachManuscript` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), [`domain/storage.ts`](../../server/src/domain/storage.ts), `manuscriptDownloads` in [`http/app.ts`](../../server/src/http/app.ts), `ManuscriptStep` in [`steps.tsx`](../../web/src/wizard/steps.tsx).
- **How it works.** The body is capped before buffering, and the whole file must be a PDF or valid UTF-8. Bytes go under a random UUID and the record is written in a versioned transaction; the new file is removed if the database refuses, the replaced one after a commit. Downloads re-check visibility and are sandboxed attachments.
- **ADRs.** [0006](../adr/0006-sniff-uploads-store-under-random-keys.md).
- **Accessibility.** The result of an upload is announced in a live region, and focus returns to the file input.

## F-07 Submit, withdraw and revise

- **What.** Authors submit a complete draft, withdraw it while no editor has claimed it, and revise a declined one into a new draft.
- **Why.** The workflow must be explicit and refuse moves it does not allow, in sentences people can read.
- **Where.** [`shared/src/workflow.ts`](../../shared/src/workflow.ts), `transition` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), [`SubmissionView.tsx`](../../web/src/author/SubmissionView.tsx), `onSubmit` in [`Wizard.tsx`](../../web/src/wizard/Wizard.tsx).
- **How it works.** Every move goes through `transition()`, which locks the record, asks the shared table and applies the move's own rules. Withdrawing asks first, because the piece leaves the queue; a refused move reloads the page so the buttons match the real status.
- **ADRs.** [0004](../adr/0004-workflow-as-a-table-invariants-in-the-database.md).
- **Accessibility.** Status is an icon plus a word (`StatusPill`), never colour alone; the withdraw question is a modal `alertdialog` whose safe choice has focus.

## F-08 Submissions list, copies and inbox

- **What.** The author's list of submissions, a way to start a new draft from an earlier one, and an inbox of decisions with read state.
- **Why.** Authors come back over weeks, and decisions must reach them without email.
- **Where.** [`MySubmissions.tsx`](../../web/src/author/MySubmissions.tsx); `listOwn`, `duplicateSubmission`, `listNotifications` and `markNotificationsRead` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts); [`notifications.ts`](../../server/src/domain/notifications.ts).
- **How it works.** A copy takes text fields only. Decision messages are written in the decision's transaction; unread ones are counted and linked, and **Mark all as read** sets `read_at`.
- **ADRs.** [0008](../adr/0008-urql-document-cache-replaced-per-session.md).
- **Accessibility.** Hidden "New:" text marks unread messages; message bodies are plain text, never HTML.

## F-09 Accepted submissions with locked fields

- **What.** After acceptance the author can still change the synopsis, pen name and biography; every other field is locked, with an explanation.
- **Why.** The editor and designer work from the accepted version, but small biographical fixes are routine.
- **Where.** `EDITABLE_AFTER_ACCEPTANCE` and `LOCKED_AFTER_ACCEPTANCE` in [`shared/src/submission.ts`](../../shared/src/submission.ts), `saveDraft` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), `Submission.lockedFields` in [`schema.ts`](../../server/src/graphql/schema.ts), [`SubmissionView.tsx`](../../web/src/author/SubmissionView.tsx).
- **How it works.** A save that touches a locked field returns `LockedFieldError` naming the fields. The page lists exactly the server's `lockedFields`, each with a disclosure button.
- **ADRs.** [0004](../adr/0004-workflow-as-a-table-invariants-in-the-database.md).
- **Accessibility.** WAI-ARIA disclosure pattern (`aria-expanded`, `aria-controls`) with a label per field.

## F-10 Review queue with filters and keyset pages

- **What.** Editors see submitted work newest first, filtered by Waiting, In review, Decided or All, with "Show older".
- **Why.** Pages must not repeat or skip items while new submissions arrive.
- **Where.** `reviewQueue` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), [`ReviewQueue.tsx`](../../web/src/editor/ReviewQueue.tsx), DataLoaders in [`context.ts`](../../server/src/graphql/context.ts), indexes in [`migrations/`](../../server/src/db/migrations).
- **How it works.** The cursor is the last `(submitted_at, id)` with microseconds, so each page is an index range read; DataLoaders keep a page at a fixed number of queries. Older pages stack below.
- **ADRs.** [0005](../adr/0005-keyset-pagination-for-the-queue.md).
- **Accessibility.** Filters are `aria-pressed` buttons whose pressed state is drawn with a border, not only colour; focus is never dropped when more items load.

## F-11 Claim, accept or decline

- **What.** An editor claims a waiting submission, then accepts it with a release date or declines it with a note.
- **Why.** One editor owns each decision, and a release date must be a real calendar date in the press's time zone.
- **Where.** [`ReviewDetail.tsx`](../../web/src/editor/ReviewDetail.tsx), `transition` and `changesFor` in [`domain/submissions.ts`](../../server/src/domain/submissions.ts), [`shared/src/dates.ts`](../../shared/src/dates.ts), `declineNoteSchema` in [`shared/src/submission.ts`](../../shared/src/submission.ts).
- **How it works.** A claim sets the editor under a record lock, and only that editor may decide. A release date falls 30 days to two years after today in `PRESS_TIME_ZONE`; a note has 10 to 2,000 characters.
- **ADRs.** [0004](../adr/0004-workflow-as-a-table-invariants-in-the-database.md).
- **Accessibility.** The date input has `min` and `max`, and its hint names both dates; success messages are announced politely.

## F-12 App shell and responsive layout

- **What.** Light, dark and system themes; a skip link; focus moved to each new page's heading; a title per page; one live region for announcements; a layout that works from a 320px phone to a desktop without sideways scrolling.
- **Why.** Keyboard and screen-reader users should start at the new content, the theme should follow the person's preference, and authors often prepare work on a phone.
- **Where.** [`Header.tsx`](../../web/src/components/Header.tsx), [`theme.ts`](../../web/src/components/theme.ts), [`Announcer.tsx`](../../web/src/components/Announcer.tsx), `useFocusOnNavigation` in [`Root.tsx`](../../web/src/routes/Root.tsx), [`pageHooks.ts`](../../web/src/components/pageHooks.ts), [`tokens.css`](../../web/src/styles/tokens.css); see [design tokens](design-tokens.md).
- **How it works.** The remembered theme is applied before the first render. After navigation focus moves to `#main h1`; not-found pages have their own. Breakpoints at 480, 600 and 860px compact the header, turn the stepper into dots and stack forms.
- **ADRs.** None.
- **Accessibility.** See [ACCESSIBILITY.md](../../ACCESSIBILITY.md).
