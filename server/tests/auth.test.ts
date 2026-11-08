import { describe, expect, it } from 'vitest';
import { DECOY_HASH, hashPassword, verifyPassword } from '../src/auth/password';
import { createSessionToken, readSessionToken, SESSION_TTL_SECONDS } from '../src/auth/session';

describe('passwords', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored).toMatch(/^scrypt\$/);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('salts every hash and never matches the decoy or malformed values', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
    expect(await verifyPassword('anything', DECOY_HASH)).toBe(false);
    expect(await verifyPassword('anything', 'plain-text')).toBe(false);
  });
});

describe('session tokens', () => {
  const secret = 'secret';

  it('round-trips a user id and the time it was issued', () => {
    expect(readSessionToken(createSessionToken('user-1', secret, 1_000), secret, 2_000)).toEqual({
      userId: 'user-1',
      issuedAt: 1_000,
    });
  });

  it('rejects tampering, wrong secrets and garbage', () => {
    const token = createSessionToken('user-1', secret);
    const [data, signature] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ userId: 'admin', expiresAt: Date.now() + 1e9 })).toString('base64url')}.${signature}`;
    expect(readSessionToken(forged, secret)).toBeNull();
    expect(readSessionToken(`${data}.AAAA`, secret)).toBeNull();
    expect(readSessionToken(token, 'other-secret')).toBeNull();
    expect(readSessionToken('nonsense', secret)).toBeNull();
    expect(readSessionToken(undefined, secret)).toBeNull();
  });

  it('expires', () => {
    const issued = Date.now();
    const token = createSessionToken('user-1', secret, issued);
    expect(readSessionToken(token, secret, issued + SESSION_TTL_SECONDS * 1000 - 1)?.userId).toBe('user-1');
    expect(readSessionToken(token, secret, issued + SESSION_TTL_SECONDS * 1000 + 1)).toBeNull();
  });
});
