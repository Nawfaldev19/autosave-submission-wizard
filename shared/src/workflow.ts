/** The editorial workflow as data: who may move a submission from which status to which. */

import type { SubmissionStatus } from './submission';

/** The two kinds of account. */
export const ROLES = ['AUTHOR', 'EDITOR'] as const;
/** An account's role: `AUTHOR` or `EDITOR`. */
export type Role = (typeof ROLES)[number];

/** Every status change the workflow knows, in the order buttons are offered. */
export const ACTIONS = ['submit', 'withdraw', 'claim', 'accept', 'decline', 'revise'] as const;
/** One workflow move, such as `submit` or `accept`. */
export type WorkflowAction = (typeof ACTIONS)[number];

interface Transition {
  readonly from: SubmissionStatus;
  readonly to: SubmissionStatus;
  readonly by: Role;
}

/**
 * The whole editorial workflow as data. The server consults it for every
 * status change; the client uses it only to decide which buttons to show.
 *
 * @remarks
 * Database check constraints repeat the invariants this table implies (for
 * example, an accepted submission has a release date).
 * @see docs/adr/0004-workflow-as-a-table-invariants-in-the-database.md
 */
export const TRANSITIONS: Readonly<Record<WorkflowAction, Transition>> = {
  submit: { from: 'DRAFT', to: 'SUBMITTED', by: 'AUTHOR' },
  withdraw: { from: 'SUBMITTED', to: 'DRAFT', by: 'AUTHOR' },
  claim: { from: 'SUBMITTED', to: 'IN_REVIEW', by: 'EDITOR' },
  accept: { from: 'IN_REVIEW', to: 'ACCEPTED', by: 'EDITOR' },
  decline: { from: 'IN_REVIEW', to: 'DECLINED', by: 'EDITOR' },
  revise: { from: 'DECLINED', to: 'DRAFT', by: 'AUTHOR' },
};

/** The verdict of {@link nextStatus}: the new status, or why the move is refused. */
export type TransitionResult =
  | { readonly ok: true; readonly to: SubmissionStatus }
  | { readonly ok: false; readonly reason: 'wrong-role' | 'wrong-status' };

/**
 * Asks the transition table whether `role` may take `action` on a submission in `current`.
 *
 * @param current - The submission's status now.
 * @param action - The requested move.
 * @param role - The role of the person asking.
 * @returns `{ ok: true, to }`, or `{ ok: false, reason }` with `wrong-role` checked before `wrong-status`.
 * @example
 * ```ts
 * nextStatus('SUBMITTED', 'claim', 'EDITOR'); // { ok: true, to: 'IN_REVIEW' }
 * nextStatus('SUBMITTED', 'claim', 'AUTHOR'); // { ok: false, reason: 'wrong-role' }
 * ```
 */
export function nextStatus(current: SubmissionStatus, action: WorkflowAction, role: Role): TransitionResult {
  const rule = TRANSITIONS[action];
  if (rule.by !== role) return { ok: false, reason: 'wrong-role' };
  if (rule.from !== current) return { ok: false, reason: 'wrong-status' };
  return { ok: true, to: rule.to };
}

/**
 * Actions a person with `role` could take on a submission in `status`.
 *
 * @param status - The submission's status.
 * @param role - The viewer's role.
 * @returns The allowed actions, in {@link ACTIONS} order.
 * @example
 * ```ts
 * availableActions('SUBMITTED', 'AUTHOR'); // ['withdraw']
 * ```
 */
export function availableActions(status: SubmissionStatus, role: Role): WorkflowAction[] {
  return ACTIONS.filter((action) => nextStatus(status, action, role).ok);
}
