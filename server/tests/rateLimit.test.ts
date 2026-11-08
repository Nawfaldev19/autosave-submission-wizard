import { afterEach, describe, expect, it } from 'vitest';
import { rateLimit, resetRateLimits, trackedKeys } from '../src/domain/rateLimit';

afterEach(() => {
  resetRateLimits();
});

describe('rate limiter memory', () => {
  it('forgets windows once they have ended', () => {
    for (let i = 0; i < 100; i += 1) rateLimit(`sign-in:client:${i}@example.com`, 10, 1_000, 0);
    expect(trackedKeys()).toBe(100);
    rateLimit('sign-in:client:later@example.com', 10, 1_000, 61_000);
    expect(trackedKeys()).toBe(1);
  });

  it('never remembers more than a fixed number of keys', () => {
    for (let i = 0; i < 10_050; i += 1) rateLimit(`key-${i}`, 10, 60_000, 5);
    expect(trackedKeys()).toBe(10_000);
  });
});
