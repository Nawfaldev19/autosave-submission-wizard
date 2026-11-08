/** Types shared by the wizard's steps. */

import type { SubmissionFieldsFragment } from '../gql/graphql';

/** A submission as the app loads it (the `SubmissionFields` fragment). */
export type Submission = SubmissionFieldsFragment;

/** What the wizard passes to every editing step. */
export interface StepProps {
  /** Null while the draft has not been saved for the first time. */
  readonly submission: Submission | null;
  /** A save is in flight. */
  readonly busy: boolean;
  /** Field errors from the last save, keyed by field. */
  readonly serverErrors: Readonly<Record<string, string>>;
  /** Field to focus on arrival, from a "Fix" link on the review step. */
  readonly focusField: string | null;
  /** Saves the step's validated values and moves on. */
  readonly onSave: (values: Record<string, unknown>) => void;
  /** Goes back without saving; `null` on the first step. */
  readonly onBack: (() => void) | null;
  /** Reports whether the form has unsaved edits, for the guard. */
  readonly onDirtyChange: (dirty: boolean) => void;
}

/** How an upload ended, as the manuscript step reports it. */
export type UploadOutcome =
  | { readonly ok: true }
  /** `error` is shown beside the file input; `null` when the page already explains it (a conflict). */
  | { readonly ok: false; readonly error: string | null };
