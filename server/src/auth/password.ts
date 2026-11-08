/** Password hashing with scrypt (RFC 7914) and constant-time comparison. */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/**
 * Hashes a password with scrypt and a random 16-byte salt.
 *
 * @param password - The plain-text password.
 * @returns `scrypt$<salt>$<hash>`, both parts in base64.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Checks a password against a stored hash in constant time.
 *
 * @param password - The password to check.
 * @param stored - A value produced by {@link hashPassword} (or {@link DECOY_HASH}).
 * @returns `true` when they match; `false` for a mismatch or a malformed hash.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, hashText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64');
  const actual = await scryptAsync(password, Buffer.from(saltText, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash to compare against when the email is unknown, so timing does not reveal accounts. */
export const DECOY_HASH = `scrypt$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(KEY_LENGTH).toString('base64')}`;
