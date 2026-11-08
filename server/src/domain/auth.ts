/**
 * Sign-in and sign-out: rate limits, the password check and session revocation.
 * Cookies are an HTTP concern and stay in the resolvers.
 */

import { eq, sql } from 'drizzle-orm';
import { createSessionToken } from '../auth/session';
import { DECOY_HASH, verifyPassword } from '../auth/password';
import { users, type UserRecord } from '../db/schema';
import { InvalidCredentialsError } from './errors';
import { rateLimit } from './rateLimit';
import type { Services } from './submissions';
import type { Viewer } from './viewer';

const FIVE_MINUTES = 5 * 60_000;
const FIFTEEN_MINUTES = 15 * 60_000;

/** What a sign-in request carries. */
export interface SignInAttempt {
  /** As typed; case and surrounding spaces are ignored. */
  readonly email: string;
  /** As typed. */
  readonly password: string;
  /** The rate-limit key for the caller (see `clientAddress` in src/http/app.ts). */
  readonly clientAddress: string;
}

/**
 * Checks an email and password and issues a session token.
 *
 * @param services - Database and clock.
 * @param attempt - The credentials and who sent them.
 * @param sessionSecret - Signs the new token.
 * @returns The user and a signed session token for the cookie.
 * @throws {@link ValidationError} once a rate limit is passed; {@link InvalidCredentialsError}
 * for an unknown email or a wrong password (the same answer for both).
 * @remarks
 * Three budgets apply: 50 attempts per client and 10 per client and email in five
 * minutes, and 100 per email from all clients together in fifteen minutes. The last
 * caps guessing spread over many addresses; one client alone cannot reach it.
 * @see docs/security/threat-model.md
 */
export async function signIn(
  services: Services,
  attempt: SignInAttempt,
  sessionSecret: string,
): Promise<{ user: UserRecord; token: string }> {
  const email = attempt.email.trim().toLowerCase();
  const now = services.now().getTime();
  rateLimit(`sign-in:${attempt.clientAddress}`, 50, FIVE_MINUTES, now);
  rateLimit(`sign-in:${attempt.clientAddress}:${email}`, 10, FIVE_MINUTES, now);
  rateLimit(`sign-in:account:${email}`, 100, FIFTEEN_MINUTES, now);
  const [user] = await services.db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email));
  // Always run the hash comparison so response time does not reveal which emails exist.
  const valid = await verifyPassword(attempt.password, user?.passwordHash ?? DECOY_HASH);
  if (!user || !valid) throw new InvalidCredentialsError();
  return { user, token: createSessionToken(user.id, sessionSecret, now) };
}

/**
 * Revokes every session of the viewer, on every device: tokens issued before now stop working.
 *
 * @param viewer - The signed-in viewer; without one there is nothing to revoke.
 * @see docs/adr/0007-signed-cookie-sessions-csrf-header-and-revocation.md
 */
export async function signOut(services: Services, viewer: Viewer | null): Promise<void> {
  if (!viewer) return;
  await services.db.update(users).set({ sessionsValidAfter: services.now() }).where(eq(users.id, viewer.id));
}
