/** The author's home: their submissions, starting or copying one, and the inbox of decisions. */

import { FORM_LABEL } from '@submission-wizard/shared';
import { Bell, CheckCheck, Copy, PenLine, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery } from 'urql';
import { duplicateMutation, markNotificationsReadMutation, mySubmissionsQuery } from '../api/operations';
import { describeError } from '../api/results';
import { useDocumentTitle } from '../components/pageHooks';
import { StatusPill } from '../components/StatusPill';
import { Button, Empty, Loading, Main, Notice } from '../components/ui';
import { useSession } from '../routes/session';

const updated = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

function submissionPath(submission: { id: string; status: string }): string {
  return submission.status === 'DRAFT'
    ? `/submissions/${submission.id}/edit/basics`
    : `/submissions/${submission.id}`;
}

/**
 * Lists the author's submissions and messages.
 *
 * @remarks
 * Unread messages are marked visually and with hidden "New:" text; each links
 * to its submission, and **Mark all as read** refetches the list.
 * @see docs/reference/features.md (F-08)
 */
export function MySubmissions() {
  const { me } = useSession();
  const navigate = useNavigate();
  useDocumentTitle('Your submissions');
  const [{ data, fetching, error }] = useQuery({
    query: mySubmissionsQuery,
    requestPolicy: 'cache-and-network',
  });
  const [, duplicate] = useMutation(duplicateMutation);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [{ fetching: marking }, markRead] = useMutation(markNotificationsReadMutation);
  const [problem, setProblem] = useState<string | null>(null);

  if (me.role !== 'AUTHOR') {
    return (
      <Main>
        <Empty title="This page is for authors" level={1}>
          <Link to="/queue">Go to the review queue</Link>
        </Empty>
      </Main>
    );
  }

  const startCopy = async (id: string) => {
    setProblem(null);
    setCopyingId(id);
    const result = await duplicate({ id });
    setCopyingId(null);
    const payload = result.data?.duplicateSubmission;
    if (payload && 'data' in payload) await navigate(`/submissions/${payload.data.id}/edit/basics`);
    else setProblem(describeError(payload));
  };

  const submissions = data?.mySubmissions ?? [];
  const inbox = data?.notifications ?? [];
  const unread = inbox.filter((n) => n.readAt === null).length;

  const markAllRead = async () => {
    setProblem(null);
    const result = await markRead({}, { additionalTypenames: ['Notification'] });
    const payload = result.data?.markNotificationsRead;
    if (!payload || !('data' in payload)) setProblem(describeError(payload));
  };

  return (
    <Main className="k-stack">
      <div className="page-head">
        <h1 className="k-page-title">Your submissions</h1>
        <Button
          variant="primary"
          icon={<Plus size={18} aria-hidden="true" />}
          onClick={() => void navigate('/submissions/new/edit/basics')}
        >
          New submission
        </Button>
      </div>
      {problem && <Notice tone="error">{problem}</Notice>}
      {error && !data && <Notice tone="error">Could not load your submissions. Please reload.</Notice>}
      {fetching && !data ? (
        <Loading label="Loading your submissions" />
      ) : submissions.length === 0 ? (
        <Empty title="Nothing here yet">
          <p>Start a submission. Each step is saved when you move on, so you can finish it later.</p>
        </Empty>
      ) : (
        <ul className="list">
          {submissions.map((s) => (
            <li key={s.id} className="k-card list-item">
              <div className="list-main">
                <Link className="list-title" to={submissionPath(s)}>
                  {s.title ?? 'Untitled draft'}
                </Link>
                <span className="k-muted">
                  {s.form ? FORM_LABEL[s.form] : 'Kind not chosen'} · updated{' '}
                  {updated.format(new Date(s.updatedAt))}
                </span>
              </div>
              <StatusPill status={s.status} />
              <div className="k-cluster">
                {s.status === 'DRAFT' && (
                  <Button
                    icon={<PenLine size={16} aria-hidden="true" />}
                    onClick={() => void navigate(`/submissions/${s.id}/edit/basics`)}
                  >
                    Continue<span className="visually-hidden"> {s.title ?? 'draft'}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  busy={copyingId === s.id}
                  disabled={copyingId !== null}
                  icon={<Copy size={16} aria-hidden="true" />}
                  onClick={() => void startCopy(s.id)}
                >
                  Start a copy<span className="visually-hidden"> of {s.title ?? 'draft'}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="k-card k-stack" role="region" aria-labelledby="inbox-heading">
        <div className="page-head">
          <h2 id="inbox-heading" className="inbox-heading">
            <Bell size={20} aria-hidden="true" /> Messages from the press
            {unread > 0 && <span className="badge">{unread} new</span>}
          </h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              busy={marking}
              icon={<CheckCheck size={16} aria-hidden="true" />}
              onClick={() => void markAllRead()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        {inbox.length === 0 ? (
          <p className="k-muted">No messages yet. You will hear from us here when an editor decides.</p>
        ) : (
          <ul className="list">
            {inbox.map((n) => {
              const about = submissions.find((s) => s.id === n.submissionId);
              return (
                <li key={n.id}>
                  <details>
                    <summary>
                      {n.readAt === null && <span className="visually-hidden">New: </span>}
                      <strong className={n.readAt === null ? 'unread' : undefined}>{n.subject}</strong>{' '}
                      <span className="k-muted">· {updated.format(new Date(n.createdAt))}</span>
                    </summary>
                    <p className="message-body">{n.body}</p>
                    {about && (
                      <p>
                        <Link className="k-link-block" to={submissionPath(about)}>
                          Open {about.title ?? 'the submission'}
                        </Link>
                      </p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Main>
  );
}
