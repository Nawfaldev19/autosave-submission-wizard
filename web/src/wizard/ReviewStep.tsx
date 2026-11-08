/** Step 5 of the wizard: a summary, the readiness checklist with "Fix" links, and Submit. */

import { FORM_LABEL, SEASON_LABEL } from '@submission-wizard/shared';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../components/ui';
import { fieldLabel } from './labels';
import type { Submission } from './types';

const STEP_TITLE: Readonly<Record<string, string>> = {
  basics: 'Basics',
  manuscript: 'Manuscript',
  schedule: 'Schedule',
  about: 'About you',
};

function SummaryItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value && value.length > 0 ? value : <span className="k-muted">Not given</span>}</dd>
    </>
  );
}

/**
 * Summary plus the server's readiness checklist; each gap links to its field
 * (`?focus=<field>` on the step that holds it).
 *
 * @see docs/reference/features.md (F-03)
 */
export function ReviewStep({
  submission,
  pressName,
  busy,
  onBack,
  onSubmit,
}: {
  /** The saved draft, including its `readiness` list. */
  submission: Submission;
  /** Named in the rights statement. */
  pressName: string;
  /** Disables Submit while a request runs. */
  busy: boolean;
  /** Goes back to step 4 through the unsaved-changes guard. */
  onBack: () => void;
  /** Submits; offered only when nothing is missing. */
  onSubmit: () => void;
}) {
  const issues = submission.readiness;
  return (
    <div className="k-stack">
      {issues.length === 0 ? (
        <p className="ready">
          <CircleCheck size={20} aria-hidden="true" /> Everything is in place. Submit when you are ready.
        </p>
      ) : (
        <div className="checklist" role="region" aria-labelledby="missing-heading">
          <h2 id="missing-heading">
            <CircleAlert size={20} aria-hidden="true" /> Still needed ({issues.length})
          </h2>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.step}-${issue.field}`}>
                <span>
                  <strong>{STEP_TITLE[issue.step]}:</strong> {issue.message}
                </span>
                <Link
                  className="fix-link"
                  to={`/submissions/${submission.id}/edit/${issue.step}?focus=${issue.field}`}
                >
                  Fix<span className="visually-hidden"> {fieldLabel(issue.field)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="summary">
        <SummaryItem label="Title" value={submission.title} />
        <SummaryItem label="Kind" value={submission.form ? FORM_LABEL[submission.form] : null} />
        <SummaryItem label="Synopsis" value={submission.synopsis} />
        <SummaryItem label="Manuscript" value={submission.manuscript?.fileName} />
        <SummaryItem label="Word count" value={submission.wordCount?.toLocaleString('en-GB')} />
        <SummaryItem label="List" value={submission.season ? SEASON_LABEL[submission.season] : null} />
        <SummaryItem label="Pen name" value={submission.penName} />
        <SummaryItem label="Biography" value={submission.bio} />
      </dl>
      <div className="k-cluster step-actions">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" busy={busy} disabled={issues.length > 0} onClick={onSubmit}>
          Submit to {pressName}
        </Button>
      </div>
    </div>
  );
}
