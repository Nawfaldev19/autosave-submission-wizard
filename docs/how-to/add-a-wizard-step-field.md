# Add a field to a wizard step

Example: an optional "content notes" field on step 3 (Schedule). Follow the layers from the database up; each step has a check.

1. **Migration.** Add `server/src/db/migrations/0004_content_notes.sql` with a header comment saying what and why:

   ```sql
   -- 0004: optional content notes on a submission, shown to editors.
   ALTER TABLE submissions ADD COLUMN content_notes text NOT NULL DEFAULT '';
   ```

   Never edit a released migration. Add a CHECK if the field has a hard rule the database should enforce.

2. **Drizzle table.** Mirror the column in [`server/src/db/schema.ts`](../../server/src/db/schema.ts): `contentNotes: text('content_notes').notNull().default('')`.

3. **Shared rule.** Add the field to the step's schema in [`shared/src/submission.ts`](../../shared/src/submission.ts) (for example `contentNotes: z.string().trim().max(400, 'Keep the notes to 400 characters or fewer.')` in `scheduleSchema`). `draftPatchSchema` picks it up automatically. Decide whether it stays editable after acceptance (`EDITABLE_AFTER_ACCEPTANCE`); if not, `LOCKED_AFTER_ACCEPTANCE` includes it automatically. Add it to the `DraftSnapshot`/`readiness()` inputs if it affects completeness, and give it a label in [`web/src/wizard/labels.ts`](../../web/src/wizard/labels.ts).

4. **GraphQL.** In [`server/src/graphql/schema.ts`](../../server/src/graphql/schema.ts), expose it on `Submission` and accept it in `DraftInput`, **each with a `description`**. Copy it in `duplicateSubmission` if a copy should keep it. Then:

   ```bash
   npm run schema:dump --workspace @submission-wizard/server
   ```

5. **Client.** Add the field to the `SubmissionFields` fragment in [`web/src/api/operations.ts`](../../web/src/api/operations.ts), run `npm run codegen`, then render it in `ScheduleStep` ([`steps.tsx`](../../web/src/wizard/steps.tsx)) with `Field` (label, hint, error) and `form.register('contentNotes')`, and in the review summary ([`ReviewStep.tsx`](../../web/src/wizard/ReviewStep.tsx)).

6. **Tests.** A shared-rule test for the limit (`shared/tests/rules.test.ts`); an API test that saves and reads it (`server/tests/api.test.ts`); a component test that it validates and saves (`web/tests/wizard.test.tsx`; add it to `web/tests/factories.ts`). `server/tests/schema.test.ts` checks the descriptions.

7. **Docs.** Update [F-02](../reference/features.md#f-02-five-step-submission-wizard), the [data model](../reference/data-model.md), the [API reference](../reference/api.md) if it matters to clients, and `CHANGELOG.md` under `[Unreleased]`.

8. **Check:** `npm run verify`.
