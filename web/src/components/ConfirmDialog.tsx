/** A modal yes-or-no question, used before an action that loses work or a place in the queue. */

import { useEffect, useId, useRef } from 'react';
import { Button } from './ui';

/**
 * A native modal `<dialog>` with the `alertdialog` role. Focus stays inside it
 * while it is open, and Escape means "cancel".
 *
 * @remarks
 * The safe choice comes first and is the primary button, so pressing Enter on
 * arrival does not lose anything.
 * @see docs/reference/features.md (F-05, F-07)
 */
export function ConfirmDialog({
  title,
  text,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  /** The question, as the dialog's name. */
  title: string;
  /** What happens if the person confirms, as the dialog's description. */
  text: string;
  /** The safe choice, such as "Stay on this step". */
  cancelLabel: string;
  /** The destructive choice, such as "Leave without saving". */
  confirmLabel: string;
  /** Called for the safe choice and for Escape. */
  onCancel: () => void;
  /** Called for the destructive choice. */
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="k-card leave-guard"
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onCancel={(cancel) => {
        cancel.preventDefault();
        onCancel();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-text`} className="k-muted">
        {text}
      </p>
      <div className="k-cluster">
        <Button variant="primary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
