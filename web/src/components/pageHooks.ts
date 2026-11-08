/** Hooks every page uses: the document title and one-time flash messages. */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Sets the browser tab's title for the current page. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Submission Wizard`;
  }, [title]);
}

/**
 * A one-time message passed in navigation state ("Submitted."). It is shown once,
 * then removed from the history entry so a reload or Back does not repeat it.
 */
export function useFlash(): string | undefined {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = (location.state as { flash?: string } | null)?.flash;
  const [flash] = useState(incoming);
  useEffect(() => {
    if (incoming) void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [incoming, navigate, location.pathname, location.search]);
  return flash;
}
