import { describe, expect, it } from 'vitest';
import { MySubmissions } from '../src/author/MySubmissions';
import { SubmissionView } from '../src/author/SubmissionView';
import { ReviewDetail } from '../src/editor/ReviewDetail';
import { ReviewQueue } from '../src/editor/ReviewQueue';
import { submission, withPeople } from './factories';
import { editor, PENDING, renderRoute, scriptedClient } from './render';

describe('MySubmissions', () => {
  const accepted = submission({ id: 's-2', status: 'ACCEPTED', title: 'The Lantern Year' });
  const message = (readAt: string | null) => ({
    __typename: 'Notification',
    id: 'n-1',
    subject: 'Accepted: The Lantern Year',
    body: 'We would love to publish The Lantern Year.',
    createdAt: '2026-03-01T10:00:00.000Z',
    readAt,
    submissionId: 's-2',
  });

  it('shows unread messages, links each to its submission, and marks them read', async () => {
    let readAt: string | null = null;
    const calls: { name: string; variables: Record<string, unknown> }[] = [];
    const client = scriptedClient(
      {
        MySubmissions: () => ({ mySubmissions: [accepted], notifications: [message(readAt)] }),
        MarkNotificationsRead: () => {
          readAt = '2026-03-10T12:00:00.000Z';
          return {
            markNotificationsRead: { __typename: 'MutationMarkNotificationsReadSuccess', data: 1 },
          };
        },
      },
      calls,
      { cache: true },
    );
    const { screen } = await renderRoute([{ path: '/submissions', element: <MySubmissions /> }], {
      url: '/submissions',
      client,
    });
    await expect.element(screen.getByText('1 new')).toBeVisible();
    const summary = screen.getByText('Accepted: The Lantern Year');
    await expect.element(summary).toHaveClass('unread');
    await expect.element(screen.getByText('New:', { exact: false })).toBeInTheDocument();
    await summary.click();
    await expect
      .element(screen.getByRole('link', { name: 'Open The Lantern Year' }))
      .toHaveAttribute('href', '/submissions/s-2');

    const fetchesBefore = calls.filter((c) => c.name === 'MySubmissions').length;
    await screen.getByRole('button', { name: 'Mark all as read' }).click();
    // The document cache drops the list once a mutation names Notification, so it is fetched again.
    await expect.element(screen.getByText('1 new')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Accepted: The Lantern Year')).not.toHaveClass('unread');
    expect(calls.filter((c) => c.name === 'MySubmissions').length).toBeGreaterThan(fetchesBefore);
    expect(document.title).toBe('Your submissions · Submission Wizard');
  });

  it('shows only the copy being made as busy', async () => {
    const client = scriptedClient({
      MySubmissions: () => ({
        mySubmissions: [accepted, submission({ id: 's-3', title: 'Salt Ledger' })],
        notifications: [],
      }),
      DuplicateSubmission: () => PENDING,
    });
    const { screen } = await renderRoute([{ path: '/submissions', element: <MySubmissions /> }], {
      url: '/submissions',
      client,
    });
    await screen.getByRole('button', { name: 'Start a copy of Salt Ledger' }).click();
    await expect
      .element(screen.getByRole('button', { name: 'Start a copy of Salt Ledger' }))
      .toHaveAttribute('aria-busy', 'true');
    await expect
      .element(screen.getByRole('button', { name: 'Start a copy of The Lantern Year' }))
      .not.toHaveAttribute('aria-busy');
  });
});

describe('ReviewQueue', () => {
  it('stacks older pages and offers "Show older" only after the last one', async () => {
    const node = (n: number) => ({
      __typename: 'Submission',
      id: `s-${n}`,
      status: 'SUBMITTED',
      title: `Story ${n}`,
      form: 'ESSAY',
      submittedAt: '2026-03-01T09:00:00.000Z',
      author: { __typename: 'User', name: 'Teodor Lindqvist' },
      editor: null,
    });
    const pages: Record<string, { nodes: number[]; endCursor: string }> = {
      first: { nodes: [5, 4], endCursor: 'c2' },
      c2: { nodes: [3, 2], endCursor: 'c4' },
      c4: { nodes: [1], endCursor: 'c5' },
    };
    const client = scriptedClient({
      ReviewQueue: ({ after }) => {
        const page = pages[(after as string | null) ?? 'first']!;
        return {
          reviewQueue: {
            __typename: 'QueryReviewQueueSuccess',
            data: {
              __typename: 'QueuePage',
              nodes: page.nodes.map(node),
              pageInfo: {
                __typename: 'PageInfo',
                hasNextPage: page.nodes.length === 2,
                endCursor: page.endCursor,
              },
            },
          },
        };
      },
    });
    const { screen } = await renderRoute([{ path: '/queue', element: <ReviewQueue /> }], {
      url: '/queue',
      client,
      session: editor,
    });
    await screen.getByRole('button', { name: 'Show older' }).click();
    // The button that had focus is gone, so focus moves to the first new entry.
    await expect.element(screen.getByRole('link', { name: 'Story 3' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Show older' }).all()).toHaveLength(1);
    await screen.getByRole('button', { name: 'Show older' }).click();
    await expect.element(screen.getByRole('link', { name: 'Story 1' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Show older' }).all()).toHaveLength(0);
  });
});

describe('SubmissionView', () => {
  it('explains locked fields after acceptance, from the keyboard too', async () => {
    const accepted = submission({
      status: 'ACCEPTED',
      releaseDate: '2026-09-15',
      lockedFields: ['title', 'form', 'file'],
      availableActions: [],
      manuscript: {
        id: 'm1',
        fileName: 'ledger.pdf',
        sizeBytes: 2048,
        downloadUrl: '/manuscripts/m1',
      },
    });
    const client = scriptedClient({ Submission: () => ({ submission: withPeople(accepted) }) });
    const { screen } = await renderRoute([{ path: '/submissions/:id', element: <SubmissionView /> }], {
      url: '/submissions/s-1',
      client,
    });
    await expect
      .element(screen.getByText('Accepted for release on Tuesday 15 September 2026.'))
      .toBeVisible();
    const why = screen.getByRole('button', { name: 'Why is title locked?' });
    await expect.element(why).toHaveAttribute('aria-expanded', 'false');
    await why.click();
    await expect.element(why).toHaveAttribute('aria-expanded', 'true');
    await expect.element(screen.getByText(/Locked after acceptance/).first()).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: /Download ledger.pdf/ }))
      .toHaveAttribute('href', '/manuscripts/m1');
    // Every locked field the server names is listed, the manuscript included.
    await expect
      .element(screen.getByRole('button', { name: 'Why is manuscript file locked?' }))
      .toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Why is kind of work locked?' })).toBeVisible();
  });

  it('shows the saved details and their new version straight away', async () => {
    const accepted = submission({
      status: 'ACCEPTED',
      releaseDate: '2026-09-15',
      bio: 'Writes about coastlines and the people who keep them.',
      lockedFields: ['title'],
      availableActions: [],
    });
    const calls: { name: string; variables: Record<string, unknown> }[] = [];
    const client = scriptedClient(
      {
        // The query keeps answering with the old version, as a slow refetch would.
        Submission: () => ({ submission: withPeople(accepted) }),
        SaveDraft: ({ version, input }) => ({
          saveDraft: {
            __typename: 'MutationSaveDraftSuccess',
            data: { ...accepted, ...(input as object), version: (version as number) + 1 },
          },
        }),
      },
      calls,
    );
    const { screen } = await renderRoute([{ path: '/submissions/:id', element: <SubmissionView /> }], {
      url: '/submissions/s-1',
      client,
    });
    const bio = screen.getByLabelText('Short biography');
    await bio.fill('Short.');
    await screen.getByRole('button', { name: 'Save details' }).click();
    await expect.element(bio).toHaveAttribute('aria-invalid', 'true');
    await expect.element(bio).toHaveAccessibleDescription(/20 characters or more/);
    expect(calls.filter((c) => c.name === 'SaveDraft')).toHaveLength(0);

    await bio.fill('Writes about lanterns, winters and the towns that keep going.');
    await screen.getByRole('button', { name: 'Save details' }).click();
    await expect.element(screen.getByText('Details updated.').first()).toBeVisible();
    // Announced through the page's one live region, which was there before the message.
    await expect.element(screen.getByRole('status')).toHaveTextContent('Details updated.');
    await expect.element(bio).toHaveValue('Writes about lanterns, winters and the towns that keep going.');
    await bio.fill('Writes about lanterns and winters, and the towns that keep going.');
    await screen.getByRole('button', { name: 'Save details' }).click();
    const versions = calls.filter((c) => c.name === 'SaveDraft').map((c) => c.variables.version);
    expect(versions).toEqual([3, 4]);
  });
});

describe('SubmissionView withdraw', () => {
  const waiting = submission({ status: 'SUBMITTED', availableActions: ['WITHDRAW'] });

  it('asks before withdrawing, and withdraws only when confirmed', async () => {
    const calls: { name: string; variables: Record<string, unknown> }[] = [];
    const client = scriptedClient(
      {
        Submission: () => ({ submission: withPeople(waiting) }),
        WithdrawSubmission: () => ({
          withdrawSubmission: {
            __typename: 'MutationWithdrawSubmissionSuccess',
            data: { ...waiting, status: 'DRAFT', version: 4 },
          },
        }),
      },
      calls,
    );
    const { screen, router } = await renderRoute(
      [
        { path: '/submissions/:id', element: <SubmissionView /> },
        { path: '/submissions/:id/edit/:step', element: <p>Editing</p> },
      ],
      { url: '/submissions/s-1', client },
    );
    await screen.getByRole('button', { name: 'Withdraw to edit' }).click();
    const dialog = screen.getByRole('alertdialog', { name: 'Withdraw this submission?' });
    await expect.element(dialog).toHaveAccessibleDescription(/leaves the review queue/);
    await expect.element(screen.getByRole('button', { name: 'Keep it submitted' })).toHaveFocus();
    await screen.getByRole('button', { name: 'Keep it submitted' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(calls.some((c) => c.name === 'WithdrawSubmission')).toBe(false);

    await screen.getByRole('button', { name: 'Withdraw to edit' }).click();
    await screen.getByRole('button', { name: 'Withdraw', exact: true }).click();
    await expect.element(screen.getByText('Editing')).toBeVisible();
    expect(router.state.location.pathname).toBe('/submissions/s-1/edit/basics');
    expect(calls.find((c) => c.name === 'WithdrawSubmission')?.variables).toEqual({ id: 's-1', version: 3 });
  });

  it('reloads the submission after a refused withdraw, so the buttons match its status', async () => {
    let stored = waiting;
    const client = scriptedClient({
      Submission: () => ({ submission: withPeople(stored) }),
      WithdrawSubmission: () => {
        // An editor claimed it in the meantime.
        stored = submission({ status: 'IN_REVIEW', version: 4, availableActions: [] });
        return {
          withdrawSubmission: {
            __typename: 'ConflictError',
            message: 'This submission changed since you opened it. Reload to see the latest version.',
            currentVersion: 4,
          },
        };
      },
    });
    const { screen } = await renderRoute([{ path: '/submissions/:id', element: <SubmissionView /> }], {
      url: '/submissions/s-1',
      client,
    });
    await screen.getByRole('button', { name: 'Withdraw to edit' }).click();
    await screen.getByRole('button', { name: 'Withdraw', exact: true }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('This submission changed since you opened it. Reload to see the latest version.');
    await expect.element(screen.getByRole('button', { name: 'Withdraw to edit' })).not.toBeInTheDocument();
  });
});

describe('ReviewDetail', () => {
  it('lets the claiming editor accept, refusing release dates that are too soon', async () => {
    const inReview = {
      ...withPeople(submission({ status: 'IN_REVIEW', availableActions: ['ACCEPT', 'DECLINE'] })),
      editor: { __typename: 'User' as const, id: 'u-editor', name: 'Hollis Beaumont' },
    };
    const client = scriptedClient({ Submission: () => ({ submission: inReview }) });
    const { screen } = await renderRoute([{ path: '/queue/:id', element: <ReviewDetail /> }], {
      url: '/queue/s-1',
      client,
      session: editor,
    });
    const date = screen.getByLabelText(/Release date/);
    await expect.element(date).toHaveValue('2026-04-09');
    await expect.element(screen.getByText('Releases on Thursday 9 April 2026.')).toBeVisible();
    await date.fill('2026-03-20');
    await expect.element(screen.getByText('Release dates must be at least 30 days away.')).toBeVisible();
    await expect
      .element(date)
      .toHaveAccessibleDescription(
        'Between Thursday 9 April 2026 and Thursday 9 March 2028. Release dates must be at least 30 days away.',
      );
    await expect.element(date).toHaveAttribute('min', '2026-04-09');
    await expect.element(date).toHaveAttribute('max', '2028-03-09');
    await expect.element(screen.getByRole('button', { name: 'Accept and schedule' })).toBeDisabled();
  });

  it('gives a missing submission a page heading of its own', async () => {
    const client = scriptedClient({ Submission: () => ({ submission: null }) });
    const { screen } = await renderRoute([{ path: '/queue/:id', element: <ReviewDetail /> }], {
      url: '/queue/nope',
      client,
      session: editor,
    });
    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Submission not found' }))
      .toBeVisible();
  });

  it('tells other editors who is reviewing', async () => {
    const theirs = {
      ...withPeople(submission({ status: 'IN_REVIEW', availableActions: [] })),
      editor: { __typename: 'User' as const, id: 'someone-else', name: 'June Haldane' },
    };
    const client = scriptedClient({ Submission: () => ({ submission: theirs }) });
    const { screen } = await renderRoute([{ path: '/queue/:id', element: <ReviewDetail /> }], {
      url: '/queue/s-1',
      client,
      session: editor,
    });
    await expect.element(screen.getByText('June Haldane is reviewing this submission.')).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Accept and schedule' })).not.toBeInTheDocument();
  });
});
