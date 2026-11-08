# Add a workflow transition

Example: let an editor **release** a claimed submission back to the queue (`IN_REVIEW → SUBMITTED`).

1. **Decide.** A new move changes the workflow's contract. Write an ADR in [docs/adr](../adr/README.md) (next number) saying why, who may do it, and what the database must still guarantee.

2. **Shared table.** In [`shared/src/workflow.ts`](../../shared/src/workflow.ts) add `'release'` to `ACTIONS` and `release: { from: 'IN_REVIEW', to: 'SUBMITTED', by: 'EDITOR' }` to `TRANSITIONS`. The exhaustive test in `shared/tests/rules.test.ts` ("allows exactly the transitions in the table, for the right role") lists the allowed moves; update its expectation.

3. **Action rules.** In `changesFor` in [`server/src/domain/submissions.ts`](../../server/src/domain/submissions.ts), add a `case 'release'` returning the column changes (here `{ editorId: null }`), and any extra check (for example, only the claiming editor: `if (current.editorId !== actor.id) throw new InvalidTransitionError(current.status, 'release')`). TypeScript's exhaustiveness check on the `switch` reminds you. Add the past tense to `PAST_TENSE` in [`errors.ts`](../../server/src/domain/errors.ts) so refusals read well.

4. **Database invariants.** Check the constraints in [migration 0001](../../server/src/db/migrations/0001_init.sql): `review_has_editor` allows `SUBMITTED` without an editor, so no migration is needed here. If a new status or invariant were involved, add a migration.

5. **GraphQL.** Add a description for the new action in `ACTION_DESCRIPTIONS` and a mutation (`workflowField('release')` with a `WORKFLOW_FIELD_DESCRIPTIONS` entry) in [`schema.ts`](../../server/src/graphql/schema.ts). Run `npm run schema:dump --workspace @submission-wizard/server`.

6. **Client.** Add the mutation document to [`operations.ts`](../../web/src/api/operations.ts), run `npm run codegen`, and offer the button in [`ReviewDetail.tsx`](../../web/src/editor/ReviewDetail.tsx) when `availableActions` contains `RELEASE`.

7. **Notifications.** If the author should hear about it, add a message in [`notifications.ts`](../../server/src/domain/notifications.ts) and call `notifyAuthor` inside `transition`.

8. **Tests.** API tests for the happy path, the wrong role, the wrong status and another editor's claim; a component test for the button; update the [state diagram](../explanation/architecture.md#submit-claim-decide), [F-11](../reference/features.md#f-11-claim-accept-or-decline), the [traceability matrix](../testing/traceability.md) and `CHANGELOG.md`.

9. **Check:** `npm run verify`.
