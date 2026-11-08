/**
 * All runtime configuration, parsed once from the environment with Zod. A bad
 * value stops the process at start-up with a message naming the variable,
 * instead of failing later inside a request. Nothing reads a `.env` file;
 * see docs/reference/configuration.md.
 */

import { resolve } from 'node:path';
import { z } from 'zod';

const DEVELOPMENT_SECRET = 'development-only-secret-do-not-use-in-production';
/** The development fallback and the example values in this repository: never acceptable in production. */
const PLACEHOLDER_SECRETS: ReadonlySet<string> = new Set([
  DEVELOPMENT_SECRET,
  'replace-with-a-long-random-value',
  'change-me-for-anything-but-a-local-demo',
]);
/** 32 bytes matches the output size of HMAC-SHA256, which signs the session tokens. */
const MIN_SECRET_BYTES = 32;

/** Unset and empty both mean "use the default". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const flag = optional(z.enum(['true', 'false']).optional());

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

const environment = z.object({
  NODE_ENV: z.string().optional(),
  PORT: optional(z.coerce.number().int().min(1).max(65_535).default(4400)),
  DATABASE_URL: optional(z.url({ protocol: /^postgres(ql)?$/ }).optional()),
  SUBMISSION_WIZARD_DATABASE: optional(z.string().optional()),
  SESSION_SECRET: optional(z.string().optional()),
  SESSION_COOKIE_SECURE: flag,
  TRUST_PROXY: optional(
    z
      .union([z.enum(['true', 'false']), z.string().regex(/^[1-9]\d?$/)], {
        error: 'Use true, false or a number of trusted proxies (1 to 99).',
      })
      .optional(),
  ),
  STORAGE_DIR: optional(z.string().optional()),
  PRESS_TIME_ZONE: optional(
    z
      .string()
      .refine(isTimeZone, { error: 'Use an IANA time zone, such as Europe/Dublin.' })
      .default('Europe/Dublin'),
  ),
  ALLOWED_ORIGINS: optional(
    z
      .string()
      .default('http://localhost:5180')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      )
      .pipe(
        z
          .array(
            z.string().refine(isOrigin, {
              error:
                'Each entry must be an origin such as https://press.example.com (no path or trailing slash).',
            }),
          )
          .min(1),
      ),
  ),
});

/** The server's settings, as {@link loadConfig} returns them. */
export interface Config {
  /** The HTTP port. */
  readonly port: number;
  /** `NODE_ENV=production`: introspection off, secure cookies and a real secret required. */
  readonly production: boolean;
  /** Connection URL; without it the standard `PG*` variables apply. */
  readonly databaseUrl: string | undefined;
  /** When set, this database is used even if `databaseUrl` names another one. */
  readonly databaseName: string | undefined;
  /** Signs session tokens. */
  readonly sessionSecret: string;
  /** Adds `Secure` to the session cookie. */
  readonly secureCookies: boolean;
  /** How many proxies in front of the server append to `x-forwarded-for`; 0 ignores the header. */
  readonly trustProxy: number;
  /** Absolute folder for manuscript files. */
  readonly storageDir: string;
  /** Shown in messages to authors. */
  readonly pressName: string;
  /** The IANA zone that decides what "today" is for release dates. */
  readonly pressTimeZone: string;
  /** Browser origins allowed to call the API. */
  readonly allowedOrigins: readonly string[];
}

/**
 * Parses and checks the environment.
 *
 * @param env - The variables to read, usually `process.env`.
 * @returns The validated settings.
 * @throws `Error` listing every invalid variable. In production that includes a
 * missing `SESSION_SECRET`, one shorter than 32 bytes, or one of the example values.
 * @example
 * ```ts
 * loadConfig({ PORT: 'abc' }); // throws: "PORT: Invalid input: expected number, received NaN"
 * ```
 * @see docs/reference/configuration.md
 */
export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config {
  const parsed = environment.safeParse(env);
  const problems = parsed.success
    ? []
    : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  const production = env.NODE_ENV === 'production';
  const secret = parsed.data?.SESSION_SECRET;
  if (production) {
    if (!secret) problems.push('SESSION_SECRET: required when NODE_ENV=production.');
    else if (PLACEHOLDER_SECRETS.has(secret))
      problems.push('SESSION_SECRET: still an example value; generate a random one.');
    else if (Buffer.byteLength(secret) < MIN_SECRET_BYTES)
      problems.push(`SESSION_SECRET: use at least ${MIN_SECRET_BYTES} bytes.`);
  }
  if (!parsed.success || problems.length > 0) {
    throw new Error(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  }
  const values = parsed.data;
  const trust = values.TRUST_PROXY;
  return {
    port: values.PORT,
    production,
    databaseUrl: values.DATABASE_URL,
    databaseName: values.SUBMISSION_WIZARD_DATABASE,
    // A fixed development secret keeps sessions working across restarts; production must set its own.
    sessionSecret: secret ?? DEVELOPMENT_SECRET,
    // Secure cookies by default in production; plain http://localhost development opts out.
    secureCookies:
      values.SESSION_COOKIE_SECURE === undefined ? production : values.SESSION_COOKIE_SECURE === 'true',
    trustProxy: trust === undefined || trust === 'false' ? 0 : trust === 'true' ? 1 : Number(trust),
    // A relative path is resolved once, from the folder the server was started in.
    storageDir: values.STORAGE_DIR
      ? resolve(values.STORAGE_DIR)
      : new URL('../storage/', import.meta.url).pathname,
    pressName: 'Larkspur Press',
    pressTimeZone: values.PRESS_TIME_ZONE,
    allowedOrigins: values.ALLOWED_ORIGINS,
  };
}

/**
 * The server's settings, read from `process.env` when the module loads.
 *
 * @see docs/reference/configuration.md
 */
export const config: Config = loadConfig(process.env);
