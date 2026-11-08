/** The editors' queue: status filters over keyset-paginated pages. */

import { FORM_LABEL } from '@submission-wizard/shared';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useQuery } from 'urql';
import { reviewQueueQuery } from '../api/operations';
import { useDocumentTitle } from '../components/pageHooks';
import { StatusPill } from '../components/StatusPill';
import { Button, Empty, Loading, Main, Notice } from '../components/ui';
import type { SubmissionStatus } from '../gql/graphql';
import { useSession } from '../routes/session';

const FILTERS: readonly { label: string; statuses: SubmissionStatus[] }[] = [
  { label: 'Waiting', statuses: ['SUBMITTED'] },
  { label: 'In review', statuses: ['IN_REVIEW'] },
  { label: 'Decided', statuses: ['ACCEPTED', 'DECLINED'] },
  { label: 'All', statuses: [] },
];

const received = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function QueuePage({
  statuses,
  after,
  onMore,
  focusOnLoad,
}: {
  statuses: SubmissionStatus[];
  after: string | null;
  /** Only the last page offers "Show older"; earlier pages have already been continued. */
  onMore: ((cursor: string) => void) | null;
  /** Set for pages added by "Show older": its button is gone, so focus moves to the first new entry. */
  focusOnLoad: boolean;
}) {
  const [{ data, fetching, error }] = useQuery({
    query: reviewQueueQuery,
    variables: { statuses, after },
    requestPolicy: 'cache-and-network',
  });
  const firstLink = useRef<HTMLAnchorElement>(null);
  const focused = useRef(false);
  useEffect(() => {
    if (!focusOnLoad || focused.current || !firstLink.current) return;
    focused.current = true;
    firstLink.current.focus();
  });
  const result = data?.reviewQueue;
  if (fetching && !result) return <Loading label="Loading submissions" />;
  if (error && !result) return <Notice tone="error">Could not load the queue. Please reload.</Notice>;
  if (!result || !('data' in result))
    return <Notice tone="error">{result?.message ?? 'The queue is unavailable.'}</Notice>;
  const page = result.data;
  if (page.nodes.length === 0 && after === null)
    return <Empty title="Nothing here">New submissions will appear as authors send them.</Empty>;
  return (
    <>
      <ul className="list">
        {page.nodes.map((s, index) => (
          <li key={s.id} className="k-card list-item">
            <div className="list-main">
              <Link className="list-title" to={`/queue/${s.id}`} ref={index === 0 ? firstLink : undefined}>
                {s.title}
              </Link>
              <span className="k-muted">
                {s.author.name} · {s.form ? FORM_LABEL[s.form] : ''} · received{' '}
                {s.submittedAt ? received.format(new Date(s.submittedAt)) : ''}
                {s.editor ? ` · with ${s.editor.name}` : ''}
              </span>
            </div>
            <StatusPill status={s.status} />
          </li>
        ))}
      </ul>
      {onMore && page.pageInfo.hasNextPage && page.pageInfo.endCursor && (
        <Button
          className="queue-more"
          onClick={() => {
            onMore(page.pageInfo.endCursor ?? '');
          }}
        >
          Show older
        </Button>
      )}
    </>
  );
}

/**
 * Keyset pages are stacked: each "Show older" adds the next page below the last
 * and moves focus to its first entry (WCAG 2.4.3, focus order).
 *
 * @see docs/reference/features.md (F-10)
 */
export function ReviewQueue() {
  const { me } = useSession();
  const [filter, setFilter] = useState(0);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  useDocumentTitle('Review queue');
  if (me.role !== 'EDITOR') return <Navigate to="/submissions" replace />;
  const statuses = FILTERS[filter]?.statuses ?? [];

  return (
    <Main className="k-stack">
      <h1 className="k-page-title">Review queue</h1>
      <div className="k-segmented" role="group" aria-label="Filter by status">
        {FILTERS.map((f, i) => (
          <Button
            key={f.label}
            variant="ghost"
            aria-pressed={filter === i}
            onClick={() => {
              setFilter(i);
              setCursors([null]);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {cursors.map((after, i) => (
        <QueuePage
          key={`${filter}-${after ?? 'first'}`}
          statuses={statuses}
          after={after}
          focusOnLoad={i > 0}
          onMore={
            i === cursors.length - 1
              ? (cursor) => {
                  setCursors([...cursors, cursor]);
                }
              : null
          }
        />
      ))}
    </Main>
  );
}
