/** A submitted, decided or accepted submission as its author sees it, with the actions its status allows. */

import {
  aboutSchema,
  basicsSchema,
  formatCalendarDate,
  FORM_LABEL,
  SEASON_LABEL,
} from '@submission-wizard/shared';
import { Download, Lock, Undo2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'urql';
import { reviseMutation, saveDraftMutation, submissionQuery, withdrawMutation } from '../api/operations';
import { describeError, fieldProblems } from '../api/results';
import { useAnnounce } from '../components/announce';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useDocumentTitle, useFlash } from '../components/pageHooks';
import { StatusPill } from '../components/StatusPill';
import { Button, Empty, Loading, Main, Notice } from '../components/ui';
import { Field } from '../wizard/fields';
import { fieldLabel } from '../wizard/labels';
import type { Submission } from '../wizard/types';

const LOCK_REASON = 'Locked after acceptance: the editor and the designer are now working from this version.';

/** A read-only value with a keyboard-reachable explanation of why it cannot change. */
function LockedValue({ label, value }: { label: string; value: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {value}{' '}
        <button
          type="button"
          className="lock-button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`Why is ${label.toLowerCase()} locked?`}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <Lock size={14} aria-hidden="true" />
        </button>
        <span id={id} className="lock-reason" hidden={!open}>
          {LOCK_REASON}
        </span>
      </dd>
    </>
  );
}

/** How a locked field reads in the summary. */
function lockedValue(submission: Submission, field: string): string {
  switch (field) {
    case 'title':
      return submission.title ?? '';
    case 'form':
      return submission.form ? FORM_LABEL[submission.form] : '—';
    case 'wordCount':
      return submission.wordCount?.toLocaleString('en-GB') ?? '—';
    case 'season':
      return submission.season ? SEASON_LABEL[submission.season] : '—';
    case 'timeSensitive':
      return submission.timeSensitive ? 'Yes' : 'No';
    case 'scheduleNote':
      return submission.scheduleNote || 'None';
    case 'rightsConfirmed':
      return submission.rightsConfirmed ? 'Confirmed' : 'Not confirmed';
    case 'file':
      return submission.manuscript?.fileName ?? '—';
    default:
      return '';
  }
}

const editableSchema = basicsSchema
  .pick({ synopsis: true })
  .extend(aboutSchema.pick({ penName: true, bio: true }).shape);

type Details = { synopsis: string; penName: string; bio: string };

/**
 * Shows a submission after the wizard: withdraw while unclaimed, revise once
 * declined, and, once accepted, edit only the synopsis, pen name and biography.
 *
 * @remarks
 * Locked fields come from the server's `lockedFields`, each with a disclosure
 * button explaining why (WAI-ARIA disclosure pattern). Withdrawing asks first,
 * because it takes the piece out of the queue. A refused action reloads the
 * submission, so the buttons match its real status.
 * @see docs/reference/features.md (F-07, F-09)
 */
export function SubmissionView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const flash = useFlash();
  const announce = useAnnounce();
  const [{ data, fetching }, refetch] = useQuery({
    query: submissionQuery,
    variables: { id },
    requestPolicy: 'cache-and-network',
  });
  const [withdrawState, withdraw] = useMutation(withdrawMutation);
  const [reviseState, revise] = useMutation(reviseMutation);
  const [saveState, save] = useMutation(saveDraftMutation);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The save result, so the page shows the new values and version before any refetch lands.
  const [saved, setSaved] = useState<Submission | null>(null);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  useEffect(() => {
    if (flash) announce(flash);
  }, [flash, announce]);

  const fromServer = data?.submission ?? null;
  const submission =
    saved && saved.id === id && (!fromServer || saved.version >= fromServer.version) ? saved : fromServer;
  useDocumentTitle(submission?.title ?? 'Submission');

  if (fetching && !submission) {
    return (
      <Main>
        <Loading label="Loading submission" />
      </Main>
    );
  }
  if (!submission) {
    return (
      <Main>
        <Empty title="Submission not found" level={1}>
          <Link to="/submissions">Back to your submissions</Link>
        </Empty>
      </Main>
    );
  }

  const accepted = submission.status === 'ACCEPTED';
  const draft = details ?? {
    synopsis: submission.synopsis ?? '',
    penName: submission.penName,
    bio: submission.bio ?? '',
  };

  const saveDetails = async () => {
    setMessage(null);
    const parsed = editableSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? ''), i.message])));
      return;
    }
    setErrors({});
    const result = await save({ id: submission.id, version: submission.version, input: parsed.data });
    const payload = result.data?.saveDraft;
    if (payload && 'data' in payload) {
      setSaved(payload.data);
      setDetails(null);
      setMessage({ tone: 'success', text: 'Details updated.' });
      announce('Details updated.');
    } else {
      setErrors(payload ? fieldProblems(payload) : {});
      setMessage({ tone: 'error', text: describeError(payload) });
    }
  };

  /** After a refused move the status shown may be stale, so read it again. */
  const refuse = (text: string) => {
    setMessage({ tone: 'error', text });
    refetch({ requestPolicy: 'network-only' });
  };

  const confirmWithdraw = async () => {
    setConfirmingWithdraw(false);
    setMessage(null);
    const result = await withdraw({ id: submission.id, version: submission.version });
    const payload = result.data?.withdrawSubmission;
    if (payload && 'data' in payload) await navigate(`/submissions/${submission.id}/edit/basics`);
    else refuse(describeError(payload));
  };

  return (
    <Main className="k-stack">
      <p>
        <Link className="k-link-block" to="/submissions">
          ← Your submissions
        </Link>
      </p>
      <div className="page-head with-status">
        <h1 className="k-page-title">{submission.title ?? 'Untitled'}</h1>
        <StatusPill status={submission.status} />
      </div>
      {flash && <Notice tone="success">{flash}</Notice>}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {accepted && submission.releaseDate && (
        <Notice tone="success">Accepted for release on {formatCalendarDate(submission.releaseDate)}.</Notice>
      )}
      {submission.status === 'DECLINED' && submission.decisionNote && (
        <div className="k-card">
          <h2>Note from the editor</h2>
          <p className="message-body">{submission.decisionNote}</p>
        </div>
      )}

      <dl className="summary k-card">
        {accepted ? (
          submission.lockedFields.map((field) => (
            <LockedValue key={field} label={fieldLabel(field)} value={lockedValue(submission, field)} />
          ))
        ) : (
          <>
            <dt>Kind</dt>
            <dd>{submission.form ? FORM_LABEL[submission.form] : '—'}</dd>
            <dt>List</dt>
            <dd>{submission.season ? SEASON_LABEL[submission.season] : '—'}</dd>
            <dt>Synopsis</dt>
            <dd>{submission.synopsis}</dd>
          </>
        )}
        {submission.manuscript && (
          <>
            <dt>Download</dt>
            <dd>
              <a href={submission.manuscript.downloadUrl} className="k-cluster">
                <Download size={16} aria-hidden="true" /> Download {submission.manuscript.fileName}
              </a>
            </dd>
          </>
        )}
      </dl>

      {accepted && (
        <form
          className="k-card k-stack"
          aria-labelledby="details-heading"
          noValidate
          onSubmit={(submit) => {
            submit.preventDefault();
            void saveDetails();
          }}
        >
          <h2 id="details-heading">Details you can still change</h2>
          <Field label="Synopsis" hint="50 to 2,000 characters." error={errors.synopsis}>
            {({ id: fieldId, describedBy, invalid }) => (
              <textarea
                id={fieldId}
                className="k-textarea prose"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                value={draft.synopsis}
                onChange={(change) => {
                  setDetails({ ...draft, synopsis: change.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Pen name" error={errors.penName}>
            {({ id: fieldId, describedBy, invalid }) => (
              <input
                id={fieldId}
                className="k-input"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                value={draft.penName}
                onChange={(change) => {
                  setDetails({ ...draft, penName: change.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Short biography" hint="20 to 600 characters." error={errors.bio}>
            {({ id: fieldId, describedBy, invalid }) => (
              <textarea
                id={fieldId}
                className="k-textarea prose short"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                value={draft.bio}
                onChange={(change) => {
                  setDetails({ ...draft, bio: change.target.value });
                }}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" busy={saveState.fetching} disabled={details === null}>
            Save details
          </Button>
        </form>
      )}

      <div className="k-cluster">
        {submission.availableActions.includes('WITHDRAW') && (
          <Button
            busy={withdrawState.fetching}
            icon={<Undo2 size={16} aria-hidden="true" />}
            onClick={() => {
              setConfirmingWithdraw(true);
            }}
          >
            Withdraw to edit
          </Button>
        )}
        {submission.availableActions.includes('REVISE') && (
          <Button
            variant="primary"
            busy={reviseState.fetching}
            onClick={() =>
              void revise({ id: submission.id }).then(async (r) => {
                const payload = r.data?.reviseSubmission;
                if (payload && 'data' in payload) await navigate(`/submissions/${submission.id}/edit/basics`);
                else refuse(describeError(payload));
              })
            }
          >
            Revise and resubmit
          </Button>
        )}
      </div>
      {confirmingWithdraw && (
        <ConfirmDialog
          title="Withdraw this submission?"
          text="It goes back to being a draft and leaves the review queue. When you submit it again, it joins the queue as a new arrival."
          cancelLabel="Keep it submitted"
          confirmLabel="Withdraw"
          onCancel={() => {
            setConfirmingWithdraw(false);
          }}
          onConfirm={() => void confirmWithdraw()}
        />
      )}
    </Main>
  );
}
