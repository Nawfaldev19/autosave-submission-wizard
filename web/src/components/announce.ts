/** The page's single polite announcer, shared through context so any page can speak through it. */

import { createContext, useContext } from 'react';

/**
 * Sends a sentence to the page's polite live region. Outside an
 * {@link AnnouncerProvider} it does nothing.
 */
export const AnnounceContext = createContext<(message: string) => void>(() => undefined);

/**
 * Returns the function that announces a sentence politely.
 *
 * @remarks
 * Screen readers often ignore a live region that is inserted already holding
 * text, so success messages go through one region that is always present.
 * @see docs/reference/features.md (F-12)
 */
export function useAnnounce(): (message: string) => void {
  return useContext(AnnounceContext);
}
