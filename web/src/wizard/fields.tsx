/** Form building blocks for the wizard and the detail pages. */

import { useId, type ReactNode } from 'react';

/** Label, control, hint and error wired together with ids and aria attributes. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  /** The visible label. */
  label: string;
  /** The current error, tied to the control with `aria-describedby`. */
  error?: string | undefined;
  /** Help text, also tied to the control. */
  hint?: string;
  /** Renders the control with the ids and state it must use. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="k-field">
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <span id={`${id}-hint`} className="k-field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="k-field-error">
          {error}
        </span>
      )}
    </div>
  );
}

/** A step's Back and submit buttons. */
export function StepActions({
  onBack,
  busy,
  submitLabel = 'Save and continue',
}: {
  /** Goes to the previous step without saving; `null` hides Back on step 1. */
  onBack: (() => void) | null;
  /** Disables the submit button while a save runs. */
  busy: boolean;
  /** The submit button's text. */
  submitLabel?: string;
}) {
  return (
    <div className="k-cluster step-actions">
      {onBack && (
        <button type="button" className="k-button k-button-ghost" onClick={onBack}>
          Back
        </button>
      )}
      <button
        type="submit"
        className="k-button k-button-primary"
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {submitLabel}
      </button>
    </div>
  );
}
