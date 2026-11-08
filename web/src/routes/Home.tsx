/** The index route and the not-found page. */

import { Link, Navigate } from 'react-router';
import { useDocumentTitle } from '../components/pageHooks';
import { Empty, Main } from '../components/ui';
import { useSession } from './session';

/** Sends editors to the queue and authors to their submissions. */
export function Home() {
  const { me } = useSession();
  return <Navigate to={me.role === 'EDITOR' ? '/queue' : '/submissions'} replace />;
}

/** Shown for any unknown path. */
export function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <Main>
      <Empty title="Page not found" level={1}>
        <Link to="/">Go home</Link>
      </Empty>
    </Main>
  );
}
