import { makeResult, type Operation } from '@urql/core';
import { getOperationAST } from 'graphql';
import type { ReactNode } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { cacheExchange, Client, Provider, type Exchange } from 'urql';
import { render } from 'vitest-browser-react';
import { filter, fromValue, mergeMap, never, pipe } from 'wonka';
import { AnnouncerProvider } from '../src/components/Announcer';
import type { SessionContext } from '../src/routes/session';

export type Handlers = Record<string, (variables: Record<string, unknown>) => unknown>;

/** A handler result that never answers, to look at a screen while a request is in flight. */
export const PENDING = Symbol('pending');

/**
 * A real urql client whose only exchange answers from `handlers` by operation
 * name. Components, hooks, the router and urql itself are all real.
 */
export function scriptedClient(
  handlers: Handlers,
  calls: { name: string; variables: Record<string, unknown> }[] = [],
  { cache = false }: { cache?: boolean } = {},
) {
  const scripted: Exchange = () => (operations$) =>
    pipe(
      operations$,
      filter((operation: Operation) => operation.kind !== 'teardown'),
      mergeMap((operation: Operation) => {
        const name = getOperationAST(operation.query)?.name?.value ?? '';
        const variables = (operation.variables ?? {}) as Record<string, unknown>;
        calls.push({ name, variables });
        const handler = handlers[name];
        if (!handler) throw new Error(`No scripted response for ${name}`);
        const data = handler(variables);
        if (data === PENDING) return never;
        return fromValue(makeResult(operation, { data: data as Record<string, unknown> }));
      }),
    );
  // With `cache`, urql's document cache sits in front, as in the app, so invalidation can be tested.
  return new Client({ url: '/graphql', exchanges: cache ? [cacheExchange, scripted] : [scripted] });
}

export const author: SessionContext = {
  me: {
    id: 'u-author',
    name: 'Wren Calloway',
    role: 'AUTHOR',
  },
  press: { name: 'Larkspur Press', timeZone: 'Europe/Dublin', today: '2026-03-10' },
};

export const editor: SessionContext = {
  me: {
    id: 'u-editor',
    name: 'Hollis Beaumont',
    role: 'EDITOR',
  },
  press: author.press,
};

export async function renderRoute(
  routes: { path: string; element: ReactNode }[],
  { url, client, session = author }: { url: string; client: Client; session?: SessionContext },
) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Outlet context={session} />,
        children: routes.map((r) => ({ ...r, path: r.path.replace(/^\//, '') })),
      },
    ],
    { initialEntries: [url] },
  );
  const screen = await render(
    <Provider value={client}>
      <AnnouncerProvider>
        <RouterProvider router={router} />
      </AnnouncerProvider>
    </Provider>,
  );
  return { screen, router };
}
