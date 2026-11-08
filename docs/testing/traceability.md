# Traceability

Which tests prove each feature. Test names are quoted exactly, so a text search finds them. Files: `shared/tests/rules.test.ts` (rules), `server/tests/auth.test.ts` (auth), `rateLimit.test.ts` (rate), `config.test.ts` (config), `api.test.ts` (api), `schema.test.ts` (schema), `release.test.ts` (release), `web/tests/*.test.ts(x)` (wizard, screens, session, header, tokens) and `e2e/*.spec.ts`.

## Features

### F-01 Sign-in, sessions and sign-out

- Unit: auth, all five tests.
- Integration: api "signs in with an HTTP-only cookie, and rejects wrong passwords with a typed error", "sets a signed, HTTP-only, SameSite cookie and clears it on sign-out", "signing out revokes the session token itself, not just the cookie", "limits repeated sign-in attempts", "keys the limit on the connection, not on a forwarded-for header the client chose", "behind a trusted proxy, keys the limit on the entry the proxy added, not one the client wrote", "caps attempts on one account however many addresses they come from".
- Component: session "signs out with a brand-new client, so nothing cached survives", "says so when signing out fails, keeps the session, and can try again", "signs in with a demo account and starts a fresh client".
- End-to-end: "signing out and in as someone else shows only their work", "signing in and opening a submission work with the keyboard".

### F-02 Five-step submission wizard

- Unit: rules "accepts partial drafts and trims text", "rejects unknown fields and out-of-range values".
- Integration: api "creates a draft and saves changes, bumping the version each time", "validates input with the shared schemas", "only lets authors write drafts, and only their own".
- Component: wizard "validates a step with the shared schema before saving anything", "creates the draft, then moves to step 2 with the new id in the URL", "starts a new draft at step 1, whatever step the address names", "keeps typed edits when the session has ended, and offers to sign in again in a new tab", "shows a step’s server errors on that step only", "marks finished steps for screen readers as well as visually".
- End-to-end: "an author completes all five steps and submits @mobile" (desktop and phone), "a saved draft resumes, and Fix links jump to the missing field".

### F-03 Readiness checklist and Fix links

- Unit: rules "is empty for a complete draft", "lists every gap in wizard order, with the step and field", "applies the same limits as the step schemas".
- Integration: api "refuses to submit an incomplete draft and lists what is missing".
- Component: wizard "lists what is missing on the review step, with links to each field", "focuses the field a Fix link points at, once".
- End-to-end: "a saved draft resumes, and Fix links jump to the missing field".

### F-04 Conflict recovery for stale tabs

- Integration: api "refuses a stale version with the current one, so the client can reload", "rejects an upload against a stale version without keeping the file".
- Component: wizard "keeps the typed edits when another tab saved first, until the author chooses to reload", "says an upload refused by a newer save was not uploaded, and offers the reload".
- End-to-end: "a stale tab cannot overwrite a newer save".

### F-05 Unsaved-changes guard

- Component: wizard "asks before leaving a step with unsaved changes", "asks before Back discards edits, and closing the dialog keeps the author on the step"; session "asks about unsaved changes before signing out".
- End-to-end: "on a tablet, the wizard’s steps fit on one line and the leave dialog fits the screen @tablet".

### F-06 Manuscript upload and protected download

- Unit: rules "recognises PDFs and UTF-8 text by content, not name", "rejects binaries, empty files and invalid UTF-8", "reads the whole file, so text followed by binary or a cut-off character is refused", "keeps file names display-safe".
- Integration: api "stores a PDF under a random key and serves it only to people who may see it", "answers a malformed download id with 404, not a server error", "judges files by their bytes and size, and cleans the name", "names downloads safely for every browser, keeping the real name in filename*", "removes the replaced manuscript, its record and its file", "still reports a committed replacement as saved when the old file cannot be deleted", "refuses an oversized body before buffering it".
- Component: wizard "keeps an unsaved word count through an upload, announces it, and saves the new version".
- End-to-end: "a disguised binary is rejected however it is named".

### F-07 Submit, withdraw and revise

- Unit: rules "allows exactly the transitions in the table, for the right role", "explains why a move is refused", "lists the buttons each role should see".
- Integration: api "lets an author withdraw a submission that nobody has claimed", "rejects moves that are not in the workflow table, in plain words", "answers a malformed id with NotFoundError on every workflow move", "keeps database invariants even if code skips the service", "only lets the claiming editor decide, and requires a note to decline" (ends with a revise).
- Component: screens "asks before withdrawing, and withdraws only when confirmed", "reloads the submission after a refused withdraw, so the buttons match its status".
- End-to-end: "an author completes all five steps and submits @mobile".

### F-08 Submissions list, copies and inbox

- Integration: api "copies text fields, not the file or the status, when starting from an earlier submission", "runs submit → claim → accept, notifying the author and locking fields".
- Component: screens "shows unread messages, links each to its submission, and marks them read", "shows only the copy being made as busy".
- End-to-end: "an editor claims and accepts a submission, and the author is told".

### F-09 Accepted submissions with locked fields

- Integration: api "runs submit → claim → accept, notifying the author and locking fields".
- Component: screens "explains locked fields after acceptance, from the keyboard too", "shows the saved details and their new version straight away".
- End-to-end: "after acceptance, locked fields explain themselves and the bio can still change".

### F-10 Review queue with filters and keyset pages

- Integration: api "pages newest first with stable keyset cursors", "loads authors and files in batches, not once per item", "filters by status, rejects bad cursors, and is for editors only", "never shows drafts to editors", "pages correctly through equal and microsecond times written by SQL".
- Component: screens "stacks older pages and offers "Show older" only after the last one".
- End-to-end: "roles stay in their lanes", "on a tablet, the queue filters show which one is on @tablet".

### F-11 Claim, accept or decline

- Unit: rules "validates real calendar dates only", "finds today in the press's zone, not the server's", "requires release dates 30 days to two years out", "formats a calendar date without shifting it", "needs 10 to 2,000 characters after trimming".
- Integration: api "runs submit → claim → accept, notifying the author and locking fields", "only lets the claiming editor decide, and requires a note to decline", "lets exactly one of two editors claiming at once win".
- Component: screens "lets the claiming editor accept, refusing release dates that are too soon", "tells other editors who is reviewing", "gives a missing submission a page heading of its own".
- End-to-end: "an editor claims and accepts a submission, and the author is told", "declining needs a real note".

### F-12 App shell and responsive layout

- Component: header "cycles the theme from system to light to dark, naming the current one, and remembers it", "applies a remembered theme before any header renders", "names the signed-in person and their role, and keeps Sign out named on a phone"; session "moves focus to the new page’s heading after navigation"; screens "shows the saved details and their new version straight away" (the live region); tokens, all three tests.
- End-to-end: "key pages never scroll sideways on a phone or a tablet", "on a tablet, the queue filters show which one is on @tablet", "signing in and opening a submission work with the keyboard".

## Security controls and other checks

Each threat in the [threat model](../security/threat-model.md) names the test that covers its mitigation, so the security mapping lives there. Checks that are not tied to a feature or a threat:

- **Configuration:** config, all four tests.
- **Health check:** api "reports unhealthy when the database does not answer".
- **Self-describing API:** schema, both tests.
- **One release version:** release "keeps every package, the lockfile, the changelog and the security policy on one version".
