/** A bounded, in-memory fixed-window rate limiter used to slow password guessing. */

import { ValidationError } from './errors';

const windows = new Map<string, { count: number; resetAt: number }>();
/** Upper bound on remembered keys, so a stream of unique emails cannot grow memory without limit. */
const MAX_KEYS = 10_000;
let nextSweep = 0;

/** Forgets windows that have ended; runs at most once a minute. */
function sweep(now: number): void {
  if (now < nextSweep) return;
  nextSweep = now + 60_000;
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
}

/**
 * Counts an attempt against `key` and refuses it once `limit` attempts fall in one window.
 *
 * @param key - What is limited, for example `sign-in:<client address>`.
 * @param limit - Attempts allowed per window.
 * @param windowMs - The window's length in milliseconds.
 * @param now - The current time; injectable for tests.
 * @throws {@link ValidationError} on the `email` field once the limit is passed.
 * @remarks
 * Kept in memory: enough to slow password guessing on one process; several
 * processes would need a shared store. At most 10,000 keys are remembered.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): void {
  sweep(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.delete(key);
    // Maps keep insertion order, so the first key is the oldest window.
    if (windows.size >= MAX_KEYS) windows.delete(windows.keys().next().value ?? '');
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new ValidationError([{ field: 'email', message: 'Too many attempts. Please wait a few minutes.' }]);
  }
}

/** How many keys the limiter remembers now. Exposed for tests of the memory bound. */
export function trackedKeys(): number {
  return windows.size;
}

/** Forgets every window. Tests call it between cases. */
export function resetRateLimits(): void {
  windows.clear();
  nextSweep = 0;
}
