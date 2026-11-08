/** The `/sign-out` route, so the unsaved-changes guard can ask before the session ends. */

import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useMutation } from 'urql';
import { signOutMutation } from '../api/operations';
import { useResetClient } from '../api/resetClient';
import { Button, Loading, Main, Notice } from '../components/ui';

/**
 * Reached from the header's Sign out button, after any unsaved-changes guard
 * has had its say. Ends the session, then drops every cached result. It does
 * not navigate: with the new client, Root shows the sign-in page here, and
 * signing in again goes home.
 *
 * @remarks
 * If the server cannot be reached the person is still signed in, so the page
 * says so and offers to try again instead of pretending it worked.
 */
export function SignOut() {
  const location = useLocation();
  // Only the header's button signs out; a link to /sign-out from elsewhere does nothing.
  const confirmed = (location.state as { confirmed?: boolean } | null)?.confirmed === true;
  const [{ fetching }, signOut] = useMutation(signOutMutation);
  const resetClient = useResetClient();
  const [failed, setFailed] = useState(false);

  const attempt = useCallback(() => {
    void signOut({}).then((result) => {
      if (result.error || result.data?.signOut !== true) setFailed(true);
      else resetClient();
    });
  }, [signOut, resetClient]);

  useEffect(() => {
    if (confirmed) attempt();
  }, [confirmed, attempt]);

  if (!confirmed) return <Navigate to="/" replace />;
  if (failed) {
    return (
      <Main className="k-stack">
        <h1 className="k-page-title">Sign out</h1>
        <Notice tone="error">
          You are still signed in: the server could not be reached. Check your connection and try again.
        </Notice>
        <div className="k-cluster">
          <Button
            variant="primary"
            busy={fetching}
            onClick={() => {
              setFailed(false);
              attempt();
            }}
          >
            Try again
          </Button>
          <Link to="/">Back to your work</Link>
        </div>
      </Main>
    );
  }
  return (
    <Main>
      <Loading label="Signing out" />
    </Main>
  );
}
