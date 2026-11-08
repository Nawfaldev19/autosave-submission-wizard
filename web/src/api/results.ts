/** Helpers for reading the typed result unions every mutation returns. */

/** Shapes shared by every mutation result union. */
export interface ErrorShape {
  /** `…Success`, or the error type's name, such as `ConflictError`. */
  readonly __typename: string;
  /** The error's sentence for the person using the app. */
  readonly message?: string;
  /** Per-field problems, on `ValidationError`. */
  readonly problems?: readonly { readonly field: string; readonly message: string }[];
  /** The stored version, on `ConflictError`. */
  readonly currentVersion?: number;
}

/**
 * Whether a result union member is the success type.
 *
 * @remarks The errors plugin names success types `<Parent><Field>Success`.
 */
export function isSuccess(result: { readonly __typename: string }): boolean {
  return result.__typename.endsWith('Success');
}

/** Field-level problems keyed by field, for form display. */
export function fieldProblems(result: ErrorShape): Record<string, string> {
  return Object.fromEntries((result.problems ?? []).map((p) => [p.field, p.message]));
}

/**
 * The message to show for a failed result.
 *
 * @param fallback - Shown when the result carries no message (for example a transport failure).
 */
export function describeError(
  result: ErrorShape | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  return result?.message ?? fallback;
}
