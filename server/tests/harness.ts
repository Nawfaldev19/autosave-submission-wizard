import { mkdir, rm } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { hashPassword } from '../src/auth/password';
import { createDb, createPool } from '../src/db/client';
import { ensureDatabase, migrate } from '../src/db/migrate';
import { users, type UserRecord } from '../src/db/schema';
import { resetRateLimits } from '../src/domain/rateLimit';
import { FileStorage } from '../src/domain/storage';
import { createApp, CSRF_HEADER } from '../src/http/app';

const DATABASE = 'submission_wizard_test';
const PASSWORD = 'correct horse battery';
const ORIGIN = 'http://localhost:5180';
const STORAGE_DIR = new URL('../.test-storage/', import.meta.url).pathname;

/**
 * Boots the real app (Yoga, plugins, services) against a real Postgres test
 * database. Requests go through `app.fetch`, the same handler Node serves.
 */
export function useHarness(options: { now?: () => Date } = {}) {
  const queries: string[] = [];
  const state = {
    clock: options.now ?? (() => new Date('2026-03-10T12:00:00Z')),
  };
  const pool = createPool(DATABASE);
  const db = createDb(pool, (sql) => queries.push(sql));
  const storage = new FileStorage(STORAGE_DIR);
  const services = {
    db,
    storage,
    pressName: 'Larkspur Press',
    pressTimeZone: 'Europe/Dublin',
    now: () => state.clock(),
  };
  const appOptions = { services, sessionSecret: 'test-secret', allowedOrigins: [ORIGIN] };
  const app = createApp(appOptions);

  beforeAll(async () => {
    await ensureDatabase(DATABASE);
    await migrate(pool);
    await mkdir(STORAGE_DIR, { recursive: true });
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE notifications, submissions, manuscripts, users CASCADE');
    resetRateLimits();
    queries.length = 0;
  });
  afterAll(async () => {
    await pool.end();
    await rm(STORAGE_DIR, { recursive: true, force: true });
  });

  async function createUser(name: string, role: 'AUTHOR' | 'EDITOR'): Promise<UserRecord> {
    const [user] = await db
      .insert(users)
      .values({
        name,
        role,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        passwordHash: await hashPassword(PASSWORD),
      })
      .returning();
    if (!user) throw new Error('user insert failed');
    return user;
  }

  async function request(
    body: BodyInit,
    headers: Record<string, string>,
    cookie?: string,
    target: ReturnType<typeof createApp> = app,
  ): Promise<Response> {
    return target.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { [CSRF_HEADER]: '1', origin: ORIGIN, ...(cookie ? { cookie } : {}), ...headers },
      body,
    });
  }

  /** Runs an operation and returns `data`, failing loudly on unexpected GraphQL errors. */
  async function gql<T = Record<string, any>>(
    query: string,
    variables: Record<string, unknown> = {},
    cookie?: string,
  ): Promise<T> {
    const response = await request(
      JSON.stringify({ query, variables }),
      { 'content-type': 'application/json' },
      cookie,
    );
    const payload = (await response.json()) as { data?: T; errors?: unknown[] };
    if (payload.errors) throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
    return payload.data as T;
  }

  async function signIn(user: UserRecord): Promise<string> {
    const response = await request(
      JSON.stringify({
        query: 'mutation($e: String!, $p: String!) { signIn(email: $e, password: $p) { __typename } }',
        variables: { e: user.email, p: PASSWORD },
      }),
      { 'content-type': 'application/json' },
    );
    const cookie = response.headers.get('set-cookie');
    if (!cookie) throw new Error('no session cookie');
    return cookie.split(';')[0] ?? '';
  }

  /** Sends a GraphQL multipart request (the upload spec) with one file, to `target` or the default app. */
  async function upload(
    query: string,
    variables: Record<string, unknown>,
    file: File,
    cookie: string,
    target: ReturnType<typeof createApp> = app,
  ) {
    const form = new FormData();
    form.set('operations', JSON.stringify({ query, variables: { ...variables, file: null } }));
    form.set('map', JSON.stringify({ 0: ['variables.file'] }));
    form.set('0', file);
    const response = await request(form, {}, cookie, target);
    return (await response.json()) as { data?: Record<string, any>; errors?: unknown[] };
  }

  return {
    app,
    appOptions,
    db,
    pool,
    storage,
    storageDir: STORAGE_DIR,
    queries,
    state,
    createUser,
    gql,
    signIn,
    upload,
    request,
  };
}
