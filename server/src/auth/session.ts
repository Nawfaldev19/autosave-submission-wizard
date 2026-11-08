/**
 * Stateless session tokens: an HMAC-SHA256 signature (RFC 2104) over a user id
 * and an expiry. Revocation lives in `users.sessions_valid_after`, checked by the HTTP layer.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** The name of the HTTP-only cookie that carries the session token. */
export const SESSION_COOKIE = 'submission_wizard_session';
/** How long a session lasts: 12 hours. */
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

interface SessionPayload {
  readonly userId: string;
  readonly expiresAt: number;
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Creates an HMAC-signed, expiring token: `<base64url(json)>.<signature>`.
 *
 * @param userId - The signed-in user's id.
 * @param secret - `SESSION_SECRET`.
 * @param nowMs - The issue time in milliseconds; injectable for tests.
 * @returns The token. It is signed, not encrypted, and holds only the id and expiry.
 * @see docs/adr/0007-signed-cookie-sessions-csrf-header-and-revocation.md
 */
export function createSessionToken(userId: string, secret: string, nowMs = Date.now()): string {
  const payload: SessionPayload = { userId, expiresAt: nowMs + SESSION_TTL_SECONDS * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data, secret)}`;
}

/** What a valid token proves. */
export interface SessionClaims {
  /** The signed-in user's id. */
  readonly userId: string;
  /** When the token was issued, in milliseconds; sign-out revokes everything issued before it. */
  readonly issuedAt: number;
}

/**
 * Verifies a session token's signature and expiry.
 *
 * @param token - The cookie value, if any.
 * @param secret - `SESSION_SECRET`.
 * @param nowMs - The current time in milliseconds; injectable for tests.
 * @returns The claims, or `null` for a missing, tampered, malformed or expired token.
 * @remarks
 * The issue time is derived from the expiry, so revocation needs no extra field.
 * @see docs/adr/0007-signed-cookie-sessions-csrf-header-and-revocation.md
 */
export function readSessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): SessionClaims | null {
  if (!token) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (typeof payload.userId !== 'string' || typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt <= nowMs) return null;
    return { userId: payload.userId, issuedAt: payload.expiresAt - SESSION_TTL_SECONDS * 1000 };
  } catch {
    return null;
  }
}
