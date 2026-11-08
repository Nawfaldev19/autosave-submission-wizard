/** Who is asking, and the two guards every domain service starts with. */

import type { Role } from '@submission-wizard/shared';
import { NotSignedInError, ForbiddenError } from './errors';

/** The signed-in user a request acts for, read from the session cookie. */
export interface Viewer {
  /** The user's id. */
  readonly id: string;
  /** `AUTHOR` or `EDITOR`; decides what the user may see and do. */
  readonly role: Role;
  /** Display name. */
  readonly name: string;
  /** Sign-in email. */
  readonly email: string;
}

/**
 * Narrows to a signed-in viewer.
 *
 * @throws {@link NotSignedInError} when there is no viewer.
 */
export function requireViewer(viewer: Viewer | null): Viewer {
  if (!viewer) throw new NotSignedInError();
  return viewer;
}

/**
 * Narrows to a signed-in viewer with `role`.
 *
 * @throws {@link NotSignedInError} when there is no viewer.
 * @throws {@link ForbiddenError} when the viewer has another role.
 */
export function requireRole(viewer: Viewer | null, role: Role): Viewer {
  const signedIn = requireViewer(viewer);
  if (signedIn.role !== role) {
    throw new ForbiddenError(role === 'EDITOR' ? 'Only editors can do that.' : 'Only authors can do that.');
  }
  return signedIn;
}
