import { describe, expect, it } from 'vitest';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { render } from 'vitest-browser-react';
import type { Client } from 'urql';
import { ClientProvider } from '../src/api/ClientProvider';
import { Main } from '../src/components/ui';
import { Root } from '../src/routes/Root';
import { SignOut } from '../src/routes/SignOut';
import { Wizard } from '../src/wizard/Wizard';
import { submission, withPeople } from './factories';
import { author, scriptedClient } from './render';

type Calls = { name: string; variables: Record<string, unknown> }[];

const press = { __typename: 'Press', ...author.press };
const signedIn = { me: { __typename: 'User', ...author.me }, press };
const signedOut = { me: null, press };

function PageA() {
  return (
    <Main>
      <h1>Page A</h1>
      <Link to="/b">Go to B</Link>
    </Main>
  );
}

function PageB() {
  return (
    <Main>
      <h1>Page B</h1>
    </Main>
  );
}

/** The real Root, sign-out route and client provider; each new client answers from the next script. */
async function renderApp(url: string, scripts: Parameters<typeof scriptedClient>[0][], calls: Calls) {
  const created: Client[] = [];
  const create = () => {
    const client = scriptedClient(scripts[Math.min(created.length, scripts.length - 1)] ?? {}, calls);
    created.push(client);
    return client;
  };
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Root />,
        children: [
          { index: true, element: <PageA /> },
          { path: 'b', element: <PageB /> },
          { path: 'sign-out', element: <SignOut /> },
          { path: 'submissions/:key/edit/:step', element: <Wizard /> },
        ],
      },
    ],
    { initialEntries: [url] },
  );
  const screen = await render(
    <ClientProvider create={create}>
      <RouterProvider router={router} />
    </ClientProvider>,
  );
  return { screen, router, created };
}

describe('Session', () => {
  it('signs out with a brand-new client, so nothing cached survives', async () => {
    const calls: Calls = [];
    const { screen, created } = await renderApp(
      '/',
      [{ Me: () => signedIn, SignOut: () => ({ signOut: true }) }, { Me: () => signedOut }],
      calls,
    );
    await expect.element(screen.getByRole('heading', { name: 'Page A' })).toBeVisible();
    await screen.getByRole('button', { name: 'Sign out' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(created).toHaveLength(2);
    // The account is asked for again, by the new client, only after the session ended.
    const names = calls.map((c) => c.name);
    expect(names.filter((n) => n === 'SignOut')).toHaveLength(1);
    const after = names.slice(names.indexOf('SignOut') + 1);
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((n) => n === 'Me')).toBe(true);
  });

  it('says so when signing out fails, keeps the session, and can try again', async () => {
    const calls: Calls = [];
    let reachable = false;
    const { screen, created } = await renderApp(
      '/',
      [
        {
          Me: () => signedIn,
          SignOut: () => (reachable ? { signOut: true } : { signOut: false }),
        },
        { Me: () => signedOut },
      ],
      calls,
    );
    await screen.getByRole('button', { name: 'Sign out' }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent(
        'You are still signed in: the server could not be reached. Check your connection and try again.',
      );
    expect(created).toHaveLength(1);
    reachable = true;
    await screen.getByRole('button', { name: 'Try again' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(created).toHaveLength(2);
  });

  it('asks about unsaved changes before signing out', async () => {
    const calls: Calls = [];
    const { screen } = await renderApp(
      '/submissions/s-1/edit/basics',
      [
        {
          Me: () => signedIn,
          Submission: () => ({ submission: withPeople(submission()) }),
          SignOut: () => ({ signOut: true }),
        },
        { Me: () => signedOut },
      ],
      calls,
    );
    await screen.getByLabelText('Title').fill('Typed but not saved');
    await screen.getByRole('button', { name: 'Sign out' }).click();
    await expect.element(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeVisible();
    expect(calls.some((c) => c.name === 'SignOut')).toBe(false);
    await screen.getByRole('button', { name: 'Stay on this step' }).click();
    await expect.element(screen.getByLabelText('Title')).toHaveValue('Typed but not saved');

    await screen.getByRole('button', { name: 'Sign out' }).click();
    await screen.getByRole('button', { name: 'Leave without saving' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(calls.some((c) => c.name === 'SignOut')).toBe(true);
  });

  it('moves focus to the new page’s heading after navigation', async () => {
    const { screen } = await renderApp('/', [{ Me: () => signedIn }], []);
    await screen.getByRole('link', { name: 'Go to B' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Page B' })).toHaveFocus();
    await expect
      .element(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#main');
  });

  it('signs in with a demo account and starts a fresh client', async () => {
    const calls: Calls = [];
    const { screen, created } = await renderApp(
      '/',
      [
        {
          Me: () => signedOut,
          SignIn: ({ password }) => ({
            signIn:
              password === 'submission-wizard-demo-pass'
                ? { __typename: 'MutationSignInSuccess', data: { __typename: 'User', id: 'u-author' } }
                : { __typename: 'InvalidCredentialsError', message: 'That email and password do not match.' },
          }),
        },
        { Me: () => signedIn },
      ],
      calls,
    );
    await screen.getByLabelText('Email').fill('wren@example.com');
    await screen.getByLabelText('Password').fill('wrong');
    await screen.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect.element(screen.getByText('That email and password do not match.')).toBeVisible();
    expect(created).toHaveLength(1);

    await screen.getByRole('button', { name: 'Wren (author)' }).click();
    await expect.element(screen.getByRole('heading', { name: 'Page A' })).toBeVisible();
    expect(created).toHaveLength(2);
    expect(calls.find((c) => c.name === 'SignIn' && c.variables.password !== 'wrong')?.variables).toEqual({
      email: 'wren@example.com',
      password: 'submission-wizard-demo-pass',
    });
  });
});
