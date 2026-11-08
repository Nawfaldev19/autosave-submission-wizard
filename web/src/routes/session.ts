/** The signed-in session, passed from `Root` to every page through the router outlet. */

import type { MeQuery } from '../gql/graphql';
import { useOutletContext } from 'react-router';

type Me = NonNullable<MeQuery['me']>;
type Press = MeQuery['press'];

/** What every signed-in page knows about the session. */
export interface SessionContext {
  /** The signed-in user. */
  readonly me: Me;
  /** The press's name, time zone and today's date there. */
  readonly press: Press;
}

/**
 * Reads the session inside a page rendered by `Root`.
 *
 * @remarks Pages render only once `me` has loaded, so `me` is never null here.
 */
export function useSession(): SessionContext {
  return useOutletContext<SessionContext>();
}
