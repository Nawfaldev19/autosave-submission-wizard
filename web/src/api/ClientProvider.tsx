/** Holds the urql client in React state so a change of session can replace it. */

import { useCallback, useState, type ReactNode } from 'react';
import { Provider, type Client } from 'urql';
import { createClient } from './client';
import { ResetClientContext } from './resetClient';

/**
 * Provides the urql client and a way to start over with a fresh one. urql's
 * document cache has no "clear", so signing in or out swaps the whole client.
 *
 * @see docs/adr/0008-urql-document-cache-replaced-per-session.md
 */
export function ClientProvider({
  children,
  create = createClient,
}: {
  /** The app. */
  children: ReactNode;
  /** Makes a client; tests pass one that scripts the network. */
  create?: () => Client;
}) {
  const [client, setClient] = useState(create);
  const reset = useCallback(() => {
    setClient(create());
  }, [create]);
  return (
    <ResetClientContext value={reset}>
      <Provider value={client}>{children}</Provider>
    </ResetClientContext>
  );
}
