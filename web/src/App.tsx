/** The route table. A data router is required for `useBlocker` (the unsaved-changes guard). */

import { createBrowserRouter, RouterProvider } from 'react-router';
import { Home, NotFound } from './routes/Home';
import { Root } from './routes/Root';
import { SignOut } from './routes/SignOut';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'sign-out', element: <SignOut /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

/** The whole app: every page renders inside `Root`, which handles the session. */
export function App() {
  return <RouterProvider router={router} />;
}
