/** The editor's decision screen: claim, then accept with a release date or decline with a note. */

import {
  addDays,
  formatCalendarDate,
  FORM_LABEL,
  MAX_DECLINE_NOTE_LENGTH,
  MAX_RELEASE_DAYS_AHEAD,
  releaseDateProblem,
  SEASON_LABEL,
} from '@submission-wizard/shared';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from 'urql';
import { acceptMutation, claimMutation, declineMutation, submissionQuery } from '../api/operations';
import { describeError, fieldProblems, isSuccess, type ErrorShape } from '../api/results';
import { useAnnounce } from '../components/announce';
import { useDocumentTitle } from '../components/pageHooks';
import { StatusPill } from '../components/StatusPill';
import { Button, Empty, Loading, Main, Notice } from '../components/ui';
import { useSession } from '../routes/session';
import { Field } from '../wizard/fields';

/**
 * One submission for an editor. Only the claiming editor sees the decision form.
 *
 * @remarks
 * The release-date field is bounded by the press's "today" (30 days to two
 * years) through `min` and `max`, and its hint states both dates.
 * Success messages are announced through the page's polite live region.
 * @see docs/reference/features.md (F-11)
 */
export function ReviewDetail() {
  const { id = '' } = useParams();
  const { me, press } = useSession();
  const [{ data, fetching }, refetch] = useQuery({
    query: submissionQuery,
    variables: { id },
    requestPolicy: 'cache-and-network',
  });
  const [claimState, claim] = useMutation(claimMutation);
  const [acceptState, accept] = useMutation(acceptMutation);
  const [declineState, decline] = useMutation(declineMutation);
  const announce = useAnnounce();
  const earliest = addDays(press.today, 30);
  const latest = addDays(press.today, MAX_RELEASE_DAYS_AHEAD);
  const [releaseDate, setReleaseDate] = useState(earliest);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submission = data?.submission;
  useDocumentTitle(submission?.title ?? 'Submission');
  if (fetching && !submission)
    return (
      <Main>
        <Loading label="Loading submission" />
      </Main>
    );
  if (!submission) {
    return (
      <Main>
        <Empty title="Submission not found" level={1}>
          <Link to="/queue">Back to the queue</Link>
        </Empty>
      </Main>
    );
  }

  const run = async (perform: () => Promise<ErrorShape | undefined>, success: string) => {
    setMessage(null);
    setErrors({});
    const payload = await perform();
    if (payload && isSuccess(payload)) {
      setMessage({ tone: 'success', text: success });
      announce(success);
      refetch({ requestPolicy: 'network-only' });
    } else {
      setErrors(fieldProblems(payload ?? { __typename: 'Error' }));
      setMessage({ tone: 'error', text: describeError(payload) });
    }
  };

  const mine = submission.editor?.id === me.id;
  const dateProblem = releaseDateProblem(releaseDate, press.today);

  return (
    <Main className="k-stack">
      <p>
        <Link className="k-link-block" to="/queue">
          ← Review queue
        </Link>
      </p>
      <div className="page-head with-status">
        <h1 className="k-page-title">{submission.title}</h1>
        <StatusPill status={submission.status} />
      </div>
      <p className="k-muted">
        By {submission.author.name}
        {submission.penName ? ` (writing as ${submission.penName})` : ''}
        {submission.editor ? ` · with ${submission.editor.name}` : ''}
      </p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <dl className="summary k-card">
        <dt>Kind</dt>
        <dd>{submission.form ? FORM_LABEL[submission.form] : '—'}</dd>
        <dt>Words</dt>
        <dd className="k-mono">{submission.wordCount?.toLocaleString('en-GB')}</dd>
        <dt>List</dt>
        <dd>
          {submission.season ? SEASON_LABEL[submission.season] : '—'}
          {submission.timeSensitive ? ' · time-sensitive' : ''}
        </dd>
        {submission.scheduleNote && (
          <>
            <dt>Timing note</dt>
            <dd>{submission.scheduleNote}</dd>
          </>
        )}
        <dt>Synopsis</dt>
        <dd>{submission.synopsis}</dd>
        <dt>Biography</dt>
        <dd>{submission.bio}</dd>
        {submission.manuscript && (
          <>
            <dt>Manuscript</dt>
            <dd>
              <a href={submission.manuscript.downloadUrl} className="k-cluster">
                <Download size={16} aria-hidden="true" /> {submission.manuscript.fileName}
              </a>
            </dd>
          </>
        )}
        {submission.releaseDate && (
          <>
            <dt>Release</dt>
            <dd>{formatCalendarDate(submission.releaseDate)}</dd>
          </>
        )}
        {submission.decisionNote && (
          <>
            <dt>Note</dt>
            <dd className="message-body">{submission.decisionNote}</dd>
          </>
        )}
      </dl>

      {submission.availableActions.includes('CLAIM') && (
        <Button
          variant="primary"
          busy={claimState.fetching}
          onClick={() =>
            void run(
              async () => (await claim({ id: submission.id })).data?.claimSubmission,
              'You are now reviewing this submission.',
            )
          }
        >
          Claim for review
        </Button>
      )}

      {submission.status === 'IN_REVIEW' && !mine && (
        <Notice>{submission.editor?.name ?? 'Another editor'} is reviewing this submission.</Notice>
      )}

      {submission.status === 'IN_REVIEW' && mine && (
        <div className="decision-grid">
          <form
            className="k-card k-stack"
            aria-labelledby="accept-heading"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                async () => (await accept({ id: submission.id, releaseDate })).data?.acceptSubmission,
                'Accepted. The author has been told.',
              );
            }}
          >
            <h2 id="accept-heading">Accept</h2>
            <Field
              label={`Release date (${press.timeZone})`}
              hint={`Between ${formatCalendarDate(earliest)} and ${formatCalendarDate(latest)}.`}
              error={errors.releaseDate ?? dateProblem ?? undefined}
            >
              {({ id: fieldId, describedBy, invalid }) => (
                <input
                  id={fieldId}
                  type="date"
                  className="k-input narrow"
                  min={earliest}
                  max={latest}
                  value={releaseDate}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  onChange={(change) => {
                    setReleaseDate(change.target.value);
                  }}
                />
              )}
            </Field>
            {!dateProblem && <p className="k-muted">Releases on {formatCalendarDate(releaseDate)}.</p>}
            <Button
              type="submit"
              variant="primary"
              busy={acceptState.fetching}
              disabled={Boolean(dateProblem)}
            >
              Accept and schedule
            </Button>
          </form>
          <form
            className="k-card k-stack"
            aria-labelledby="decline-heading"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                async () => (await decline({ id: submission.id, note })).data?.declineSubmission,
                'Declined. The author has your note.',
              );
            }}
          >
            <h2 id="decline-heading">Decline</h2>
            <Field
              label="Note to the author"
              hint="10 to 2,000 characters. Authors read every word."
              error={errors.note}
            >
              {({ id: fieldId, describedBy, invalid }) => (
                <textarea
                  id={fieldId}
                  className="k-textarea prose short"
                  value={note}
                  maxLength={MAX_DECLINE_NOTE_LENGTH}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  onChange={(change) => {
                    setNote(change.target.value);
                  }}
                />
              )}
            </Field>
            <Button type="submit" variant="danger" busy={declineState.fetching}>
              Decline with note
            </Button>
          </form>
        </div>
      )}
    </Main>
  );
}
