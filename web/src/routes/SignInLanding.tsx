/** The landing and sign-in page, with one-click buttons for two demo accounts. */

import { CalendarCheck, FileStack, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from 'urql';
import { describeError, isSuccess } from '../api/results';
import { signInMutation } from '../api/operations';
import { Header } from '../components/Header';
import { useDocumentTitle } from '../components/pageHooks';
import { Button, Main, Notice } from '../components/ui';

const DEMO_PASSWORD = 'submission-wizard-demo-pass';

const DEMO = [
  { label: 'Wren (author)', email: 'wren@example.com' },
  { label: 'Hollis (editor)', email: 'hollis@example.com' },
] as const;

const POINTS = [
  {
    icon: FileStack,
    title: 'A wizard that keeps your place',
    body: 'Five steps, each saved when you move on. Come back later to finish, and a stale tab cannot overwrite a newer save.',
  },
  {
    icon: Workflow,
    title: 'An explicit workflow',
    body: 'Draft, submitted, in review, accepted or declined: every move is checked on the server against one transition table.',
  },
  {
    icon: CalendarCheck,
    title: 'Dates that stay dates',
    body: 'Release dates are calendar dates in the press’s time zone, so nobody’s launch moves by a day.',
  },
] as const;

/**
 * Introduces the demo and signs people in.
 *
 * @remarks The demo password is public by design (all accounts are fictional; see README).
 * @see docs/reference/features.md (F-01)
 */
export function SignInLanding({
  pressName = 'the press',
  onSignedIn,
}: {
  /** Shown in the header and the introduction. */
  pressName?: string | undefined;
  /** Called after a successful sign-in; `Root` replaces the client then. */
  onSignedIn: () => void;
}) {
  useDocumentTitle('Sign in');
  const [{ fetching }, signIn] = useMutation(signInMutation);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (credentials: { email: string; password: string }) => {
    setProblem(null);
    const result = await signIn(credentials);
    const payload = result.data?.signIn;
    if (payload && isSuccess(payload)) onSignedIn();
    else setProblem(result.error ? 'Cannot reach the server. Please try again.' : describeError(payload));
  };

  return (
    <div className="k-shell">
      <Header pressName={pressName} />
      <Main className="k-survey landing">
        <div className="k-stack landing-intro">
          <p className="eyebrow">{pressName} · small press</p>
          <h1 className="hero">Send us your manuscript. We will read every page.</h1>
          <p className="k-muted lede">
            Submission Wizard is the submissions desk of {pressName}, a fictional publisher. Authors prepare
            and send work; editors claim it, then accept with a release date or decline with a note.
          </p>
        </div>
        <div className="k-card k-stack signin">
          <h2 className="k-page-title">Sign in</h2>
          <form
            className="k-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void submit({ email, password });
            }}
          >
            <label className="k-field">
              Email
              <input
                className="k-input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </label>
            <label className="k-field">
              Password
              <input
                className="k-input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
            </label>
            {problem && <Notice tone="error">{problem}</Notice>}
            <Button type="submit" variant="primary" busy={fetching}>
              Sign in
            </Button>
          </form>
          <div className="k-stack" role="group" aria-labelledby="demo-heading">
            <h3 id="demo-heading">Demo accounts</h3>
            <p className="k-muted">
              Fictional people. Password for all: <code>{DEMO_PASSWORD}</code>
            </p>
            <div className="k-cluster">
              {DEMO.map((account) => (
                <Button
                  key={account.email}
                  disabled={fetching}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    void submit({ email: account.email, password: DEMO_PASSWORD });
                  }}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <ul className="points">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="k-card">
              <Icon size={22} aria-hidden="true" className="point-icon" />
              <h2>{title}</h2>
              <p className="k-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Main>
    </div>
  );
}
