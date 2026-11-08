/** The context through which pages ask for a fresh urql client. */

import { createContext, useContext } from 'react';

/** Replaces the urql client, and with it every cached result. */
export const ResetClientContext = createContext<() => void>(() => undefined);

/** Call after the session changes, so one person's cached data never shows to the next. */
export function useResetClient(): () => void {
  return useContext(ResetClientContext);
}
