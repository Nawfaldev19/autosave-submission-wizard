import { describe, expect, it } from 'vitest';
import { Wizard } from '../src/wizard/Wizard';
import { submission, withPeople } from './factories';
import { renderRoute, scriptedClient } from './render';

const route = [{ path: '/submissions/:key/edit/:step', element: <Wizard /> }];

describe('Wizard', () => {
  it('validates a step with the shared schema before saving anything', async () => {
    const calls: { name: string }[] = [];
    const { screen } = await renderRoute(route, {
      url: '/submissions/new/edit/basics',
      client: scriptedClient({}, calls as never),
    });
    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect.element(screen.getByText('Give your work a title.')).toBeVisible();
    await expect.element(screen.getByText('The synopsis needs at least 50 characters.')).toBeVisible();
    await expect.element(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toEqual([]);
  });

  it('creates the draft, then moves to step 2 with the new id in the URL', async () => {
    const calls: { name: string; variables: Record<string, unknown> }[] = [];
    const created = submission({
      id: 'new-id',
      version: 1,
      readiness: [{ step: 'manuscript', field: 'file', message: 'Upload' }],
    });
    const client = scriptedClient(
      {
        CreateDraft: () => ({ createDraft: { __typename: 'MutationCreateDraftSuccess', data: created } }),
        Submission: () => ({ submission: withPeople(created) }),
      },
      calls,
    );
    const { screen, router } = await renderRoute(route, { url: '/submissions/new/edit/basics', client });
    await screen.getByLabelText('Title').fill('Salt Ledger');
    await screen.getByLabelText('Kind of work').selectOptions('CHAPBOOK');
    await screen
      .getByLabelText('Synopsis')
      .fill('Twenty-four short poems kept like entries in a harbour ledger, one for every tide.');
    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Step 2 of 5: Manuscript' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/submissions/new-id/edit/manuscript');
    expect(calls.find((c) => c.name === 'CreateDraft')?.variables).toEqual({
      input: {
        title: 'Salt Ledger',
        form: 'CHAPBOOK',
        synopsis: 'Twenty-four short poems kept like entries in a harbour ledger, one for every tide.',
      },
    });
  });

  it('keeps the typed edits when another tab saved first, until the author chooses to reload', async () => {
    let stored = submission();
    const client = scriptedClient({
      Submission: () => ({ submission: withPeople(stored) }),
      SaveDraft: () => ({
        saveDraft: {
          __typename: 'ConflictError',
          message: 'This submission changed since you opened it.',
          currentVersion: 4,
        },
      }),
    });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/basics', client });
    await screen.getByLabelText('Title').fill('A newer title');
    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect.element(screen.getByText(/This submission changed since you opened it/)).toBeVisible();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('A newer title');

    stored = submission({ version: 4, title: 'Saved in another tab' });
    await screen.getByRole('button', { name: 'Reload latest version' }).click();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Saved in another tab');
    await expect.element(screen.getByText(/changed since you opened it/)).not.toBeInTheDocument();
  });

  it('keeps an unsaved word count through an upload, announces it, and saves the new version', async () => {
    const calls: { name: string; variables: Record<string, unknown> }[] = [];
    const uploaded = submission({
      version: 4,
      manuscript: { id: 'm1', fileName: 'ledger.pdf', sizeBytes: 2048, downloadUrl: '/manuscripts/m1' },
    });
    const client = scriptedClient(
      {
        Submission: () => ({ submission: withPeople(submission()) }),
        UploadManuscript: () => ({
          uploadManuscript: { __typename: 'MutationUploadManuscriptSuccess', data: uploaded },
        }),
        SaveDraft: () => ({
          saveDraft: { __typename: 'MutationSaveDraftSuccess', data: { ...uploaded, version: 5 } },
        }),
      },
      calls,
    );
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/manuscript', client });
    await screen.getByLabelText('Word count').fill('8,400');
    const fileInput = screen.getByLabelText('Manuscript file');
    await fileInput.upload(new File(['%PDF-1.4'], 'ledger.pdf', { type: 'application/pdf' }));
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'Uploaded ledger.pdf.' }))
      .toBeVisible();
    await expect.element(screen.getByLabelText('Word count')).toHaveValue('8,400');
    await expect.element(fileInput).toHaveFocus();

    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Step 3 of 5: Schedule' })).toBeVisible();
    expect(calls.find((c) => c.name === 'SaveDraft')?.variables).toEqual({
      id: 's-1',
      version: 4,
      input: { wordCount: 8400 },
    });
  });

  it('says an upload refused by a newer save was not uploaded, and offers the reload', async () => {
    const client = scriptedClient({
      Submission: () => ({ submission: withPeople(submission()) }),
      UploadManuscript: () => ({
        uploadManuscript: {
          __typename: 'ConflictError',
          message: 'This submission changed since you opened it. Reload to see the latest version.',
          currentVersion: 4,
        },
      }),
    });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/manuscript', client });
    await screen
      .getByLabelText('Manuscript file')
      .upload(new File(['%PDF-1.4'], 'ledger.pdf', { type: 'application/pdf' }));
    await expect
      .element(screen.getByRole('status').filter({ hasText: 'ledger.pdf was not uploaded.' }))
      .toBeVisible();
    await expect.element(screen.getByText('Uploaded ledger.pdf.')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Reload latest version' })).toBeVisible();
  });

  it('keeps typed edits when the session has ended, and offers to sign in again in a new tab', async () => {
    const client = scriptedClient({
      Submission: () => ({ submission: withPeople(submission()) }),
      SaveDraft: () => ({ saveDraft: { __typename: 'NotSignedInError', message: 'Please sign in.' } }),
    });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/basics', client });
    await screen.getByLabelText('Title').fill('Typed after lunch');
    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent(
        'Your session has ended, so this step was not saved. Your edits are still here. Sign in again in a new tab, then come back and save this step.',
      );
    const signIn = screen.getByRole('link', { name: 'Sign in again in a new tab' });
    await expect.element(signIn).toHaveAttribute('target', '_blank');
    await expect.element(signIn).toHaveAttribute('href', '/');
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Typed after lunch');
  });

  it('starts a new draft at step 1, whatever step the address names', async () => {
    const { screen, router } = await renderRoute(route, {
      url: '/submissions/new/edit/review',
      client: scriptedClient({}),
    });
    await expect.element(screen.getByRole('heading', { name: 'Step 1 of 5: Basics' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/submissions/new/edit/basics');
  });

  it('asks before Back discards edits, and closing the dialog keeps the author on the step', async () => {
    const client = scriptedClient({ Submission: () => ({ submission: withPeople(submission()) }) });
    const { screen, router } = await renderRoute(route, { url: '/submissions/s-1/edit/manuscript', client });
    await screen.getByLabelText('Word count').fill('9000');
    await screen.getByRole('button', { name: 'Back' }).click();
    const dialog = screen.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect.element(dialog).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Stay on this step' })).toHaveFocus();
    // requestClose() is what Escape does: it asks the dialog to close, and the page may refuse.
    (dialog.element() as HTMLDialogElement).requestClose();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/submissions/s-1/edit/manuscript');
    await expect.element(screen.getByLabelText('Word count')).toHaveValue('9000');

    await screen.getByRole('button', { name: 'Back' }).click();
    await screen.getByRole('button', { name: 'Leave without saving' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Step 1 of 5: Basics' })).toBeVisible();
  });

  it('shows a step’s server errors on that step only', async () => {
    const client = scriptedClient({
      Submission: () => ({ submission: withPeople(submission()) }),
      SaveDraft: () => ({
        saveDraft: {
          __typename: 'ValidationError',
          message: 'We read manuscripts of at least 500 words.',
          problems: [{ field: 'wordCount', message: 'We read manuscripts of at least 500 words.' }],
        },
      }),
    });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/manuscript', client });
    await screen.getByLabelText('Word count').fill('600');
    await screen.getByRole('button', { name: 'Save and continue' }).click();
    await expect.element(screen.getByText(/at least 500 words/).first()).toBeVisible();
    await expect.element(screen.getByLabelText('Word count')).toHaveAttribute('aria-invalid', 'true');
    await screen.getByRole('button', { name: 'Back' }).click();
    await screen.getByRole('button', { name: 'Leave without saving' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Step 1 of 5: Basics' })).toBeVisible();
    await expect.element(screen.getByText(/at least 500 words/)).not.toBeInTheDocument();
  });

  it('lists what is missing on the review step, with links to each field', async () => {
    const current = submission({
      readiness: [
        {
          step: 'manuscript',
          field: 'wordCount',
          message: 'Enter the word count as a number.',
        },
        {
          step: 'about',
          field: 'bio',
          message: 'Tell us a little about yourself.',
        },
      ],
    });
    const client = scriptedClient({ Submission: () => ({ submission: withPeople(current) }) });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/review', client });
    await expect.element(screen.getByRole('heading', { name: 'Still needed (2)' })).toBeVisible();
    await expect
      .element(screen.getByRole('link', { name: 'Fix Short biography' }))
      .toHaveAttribute('href', '/submissions/s-1/edit/about?focus=bio');
    await expect.element(screen.getByRole('button', { name: 'Submit to Larkspur Press' })).toBeDisabled();
  });

  it('focuses the field a Fix link points at, once', async () => {
    const client = scriptedClient({ Submission: () => ({ submission: withPeople(submission()) }) });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/about?focus=bio', client });
    await expect.element(screen.getByLabelText('Short biography')).toHaveFocus();
    // Typing elsewhere re-renders the form; focus must stay where the author put it.
    const penName = screen.getByLabelText('Pen name (optional)');
    await penName.fill('W. Calloway');
    await expect.element(penName).toHaveFocus();
  });

  it('marks finished steps for screen readers as well as visually', async () => {
    const client = scriptedClient({
      Submission: () => ({
        submission: withPeople(
          submission({ readiness: [{ step: 'manuscript', field: 'file', message: 'Upload' }] }),
        ),
      }),
    });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/basics', client });
    await expect.element(screen.getByRole('link', { name: /Basics \(complete\)/ })).toBeVisible();
    await expect.element(screen.getByRole('link', { name: /^2\s*Manuscript$/ })).toBeVisible();
    expect(document.title).toBe('Step 1 of 5: Basics · Submission Wizard');
  });

  it('asks before leaving a step with unsaved changes', async () => {
    const client = scriptedClient({ Submission: () => ({ submission: withPeople(submission()) }) });
    const { screen } = await renderRoute(route, { url: '/submissions/s-1/edit/basics', client });
    await screen.getByLabelText('Title').fill('Changed but not saved');
    await screen.getByRole('link', { name: /Schedule/ }).click();
    await expect.element(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeVisible();
    await screen.getByRole('button', { name: 'Stay on this step' }).click();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Changed but not saved');
  });
});
