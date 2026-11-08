/**
 * Expected failures. Each class becomes a GraphQL object type, and mutations
 * return them as members of a result union instead of throwing to the client.
 * Messages are written for the person using the app and never include internals.
 *
 * @see docs/adr/0002-errors-as-result-unions.md
 */

import type { ReadinessIssue } from '@submission-wizard/shared';

/** The operation needs a signed-in user and there is none. */
export class NotSignedInError extends Error {
  constructor() {
    super('Please sign in.');
    this.name = 'NotSignedInError';
  }
}

/** The viewer is signed in but their role cannot do this. */
export class ForbiddenError extends Error {
  constructor(message = 'Your role cannot do that.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * The record does not exist, or the viewer may not see it.
 *
 * @remarks
 * Both cases give the same answer, so ids of other people's work cannot be probed.
 */
export class NotFoundError extends Error {
  constructor(what = 'submission') {
    super(`That ${what} does not exist, or you cannot see it.`);
    this.name = 'NotFoundError';
  }
}

/** Sign-in failed. The message does not say whether the email or the password was wrong. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('That email and password do not match.');
    this.name = 'InvalidCredentialsError';
  }
}

/** One invalid input field. */
export interface FieldProblem {
  /** The input field's name, as the client sent it. */
  readonly field: string;
  /** What is wrong, as a sentence. */
  readonly message: string;
}

/** Input failed the shared rules; `problems` lists each field. */
export class ValidationError extends Error {
  constructor(readonly problems: readonly FieldProblem[]) {
    super(problems.map((p) => p.message).join(' '));
    this.name = 'ValidationError';
  }
}

/**
 * Optimistic concurrency: the caller edited an older version than the one stored.
 *
 * @see docs/adr/0003-optimistic-concurrency-with-a-version-column.md
 */
export class ConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super('This submission changed since you opened it. Reload to see the latest version.');
    this.name = 'ConflictError';
  }
}

const PAST_TENSE: Readonly<Record<string, string>> = {
  submit: 'submitted',
  withdraw: 'withdrawn',
  claim: 'claimed',
  accept: 'accepted',
  decline: 'declined',
  revise: 'revised',
  edit: 'edited',
};

/** The subject of the sentence, article included: "A draft", "An accepted submission". */
const STATUS_PHRASE: Readonly<Record<string, string>> = {
  DRAFT: 'A draft',
  SUBMITTED: 'A submission waiting for review',
  IN_REVIEW: 'A submission in review',
  ACCEPTED: 'An accepted submission',
  DECLINED: 'A declined submission',
};

/** The workflow does not allow this move from the submission's current status (or by this editor). */
export class InvalidTransitionError extends Error {
  constructor(
    readonly status: string,
    readonly action: string,
  ) {
    super(`${STATUS_PHRASE[status] ?? 'This submission'} cannot be ${PAST_TENSE[action] ?? action}.`);
    this.name = 'InvalidTransitionError';
  }
}

/** An accepted submission's save touched fields that are locked after acceptance. */
export class LockedFieldError extends Error {
  constructor(readonly fields: readonly string[]) {
    super(`These fields are locked after acceptance: ${fields.join(', ')}.`);
    this.name = 'LockedFieldError';
  }
}

/** `submit` was refused because {@link ReadinessIssue | readiness} still lists gaps. */
export class IncompleteSubmissionError extends Error {
  constructor(readonly issues: readonly ReadinessIssue[]) {
    super('Some details are still missing.');
    this.name = 'IncompleteSubmissionError';
  }
}

/** The upload is empty, too large, or neither a PDF nor UTF-8 text. */
export class UploadRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRejectedError';
  }
}
