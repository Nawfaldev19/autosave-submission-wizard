/** A submission's workflow status as a labelled pill. */

import type { SubmissionStatus } from '../gql/graphql';
import { CircleCheck, CircleX, FileEdit, Hourglass, Search } from 'lucide-react';

const LOOK: Readonly<Record<SubmissionStatus, { label: string; tone: string; icon: typeof CircleCheck }>> = {
  DRAFT: { label: 'Draft', tone: 'muted', icon: FileEdit },
  SUBMITTED: { label: 'Submitted', tone: 'info', icon: Hourglass },
  IN_REVIEW: { label: 'In review', tone: 'warning', icon: Search },
  ACCEPTED: { label: 'Accepted', tone: 'success', icon: CircleCheck },
  DECLINED: { label: 'Declined', tone: 'danger', icon: CircleX },
};

/** Status shown as icon plus text, never colour alone. */
export function StatusPill({
  status,
}: {
  /** The status to show. */
  status: SubmissionStatus;
}) {
  const look = LOOK[status];
  const Icon = look.icon;
  return (
    <span className={`k-pill k-pill-${look.tone}`}>
      <Icon size={14} aria-hidden="true" />
      {look.label}
    </span>
  );
}
