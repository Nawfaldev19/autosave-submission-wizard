/** The route table. A data router is required for `useBlocker` (the unsaved-changes guard). */

import { createBrowserRouter, RouterProvider } from 'react-router';
import { MySubmissions } from './author/MySubmissions';
import { SubmissionView } from './author/SubmissionView';
import { ReviewDetail } from './editor/ReviewDetail';
import { ReviewQueue } from './editor/ReviewQueue';
import { Home, NotFound } from './routes/Home';
import { Root } from './routes/Root';
import { SignOut } from './routes/SignOut';
import { Wizard } from './wizard/Wizard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'submissions', element: <MySubmissions /> },
      // One route for "new" and existing drafts, so saving a new draft swaps the
      // id into the URL without remounting the wizard.
      { path: 'submissions/:key/edit/:step', element: <Wizard /> },
      { path: 'submissions/:id', element: <SubmissionView /> },
      { path: 'queue', element: <ReviewQueue /> },
      { path: 'queue/:id', element: <ReviewDetail /> },
      { path: 'sign-out', element: <SignOut /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

/** The whole app: every page renders inside `Root`, which handles the session. */
export function App() {
  return <RouterProvider router={router} />;
}
