/** Structured logging. Callers pass identifiers and counts, never passwords, tokens or file contents. */

type Level = 'info' | 'warn' | 'error';

/**
 * Writes one JSON object per line, so logs can be searched and parsed.
 *
 * @param level - `error` goes to stderr; `info` and `warn` go to stdout, except under `NODE_ENV=test`.
 * @param msg - A short, constant description of what happened.
 * @param fields - Extra structured detail. Must not contain secrets or personal data beyond ids.
 */
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  if (level === 'error') process.stderr.write(`${line}\n`);
  else if (process.env.NODE_ENV !== 'test') process.stdout.write(`${line}\n`);
}
