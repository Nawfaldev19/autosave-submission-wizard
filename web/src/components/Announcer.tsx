/** Renders the one polite live region every page announces through. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnnounceContext } from './announce';

/**
 * Provides {@link useAnnounce} to its children and renders the live region after them.
 *
 * @remarks
 * The region is in the page from the start and only its text changes. It is
 * cleared first, so announcing the same sentence twice is still heard.
 */
export function AnnouncerProvider({
  children,
}: {
  /** The pages that may announce. */
  children: ReactNode;
}) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );
  const announce = useCallback((text: string) => {
    setMessage('');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setMessage(text);
    }, 50);
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
