/** The app shell: loads the session, shows sign-in when there is none, and moves focus on navigation. */

import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from 'urql';
import { meQuery } from '../api/operations';
import { useResetClient } from '../api/resetClient';
import { AnnouncerProvider } from '../components/Announcer';
import { Header } from '../components/Header';
import { Loading, Main, Notice } from '../components/ui';
import type { SessionContext } from './session';
import { SignInLanding } from './SignInLanding';

/**
 * After in-app navigation, moves focus to the new page's heading (or its main
 * landmark while it loads), so keyboard and screen-reader users start at the
 * top of the new content. A `?focus=` link is left to focus its own field.
 */
function useFocusOnNavigation(): void {
  const { pathname, search } = useLocation();
  const shown = useRef(pathname);
  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    if (new URLSearchParams(search).has('focus')) return;
    const target =
      document.querySelector<HTMLElement>('#main h1') ?? document.querySelector<HTMLElement>('#main');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus();
  }, [pathname, search]);
}

/**
 * The parent of every route. Without a session it renders the sign-in page;
 * with one, the header and the page, which reads the session through `useSession`.
 *
 * @see docs/reference/features.md (F-01, F-12)
 */
export function Root() {
  const [{ data, fetching, error }] = useQuery({ query: meQuery });
  const resetClient = useResetClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useFocusOnNavigation();

  if (fetching && !data) {
    return (
      <Main>
        <Loading label="Loading your account" />
      </Main>
    );
  }
  if (error && !data) {
    return (
      <Main>
        <Notice tone="error">Cannot reach the server. Check your connection and reload the page.</Notice>
      </Main>
    );
  }
  if (!data?.me) {
    return (
      <SignInLanding
        pressName={data?.press.name}
        onSignedIn={() => {
          // No page renders until the new client has loaded the account, so the page
          // (or, after signing out, home) is shown with the new person's role.
          resetClient();
          if (pathname === '/sign-out') void navigate('/', { replace: true });
        }}
      />
    );
  }

  const context: SessionContext = { me: data.me, press: data.press };
  return (
    <AnnouncerProvider>
      <div className="k-shell">
        <Header
          pressName={data.press.name}
          user={{ name: data.me.name, role: data.me.role === 'EDITOR' ? 'Editor' : 'Author' }}
          onSignOut={() => {
            // Navigating first lets the unsaved-changes guard ask before the session ends.
            void navigate('/sign-out', { state: { confirmed: true } });
          }}
        />
        <Outlet context={context} />
      </div>
    </AnnouncerProvider>
  );
}
