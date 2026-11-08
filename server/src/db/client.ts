/** Postgres connection settings, the pool and the typed Drizzle client. */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config';
import * as schema from './schema';

/** The database used when neither `SUBMISSION_WIZARD_DATABASE` nor `DATABASE_URL` names one. */
export const DEFAULT_DATABASE = 'submission_wizard_development';

/**
 * Connection settings for `database`. With DATABASE_URL, the URL's host and
 * credentials are kept and only the database name is swapped, so a named
 * database (the test or end-to-end one) is never confused with the URL's own.
 *
 * @param database - The database to connect to; omitted means the URL's own (or the default).
 * @returns Options for `pg.Pool` or `pg.Client`. Without `DATABASE_URL`, the `PG*` variables apply.
 */
export function connectionConfig(database?: string): pg.PoolConfig {
  if (config.databaseUrl) {
    if (!database) return { connectionString: config.databaseUrl };
    const url = new URL(config.databaseUrl);
    url.pathname = `/${encodeURIComponent(database)}`;
    return { connectionString: url.toString() };
  }
  return { database: database ?? DEFAULT_DATABASE };
}

/**
 * Opens a connection pool (at most 10 connections).
 *
 * @param databaseName - The database to use; defaults to `SUBMISSION_WIZARD_DATABASE`.
 */
export function createPool(databaseName = config.databaseName): pg.Pool {
  return new pg.Pool({ ...connectionConfig(databaseName), max: 10 });
}

/**
 * Wraps a pool in a typed Drizzle client.
 *
 * @param pool - The connection pool.
 * @param onQuery - Called with each SQL statement; tests use it to prove there is no N+1.
 */
export function createDb(pool: pg.Pool, onQuery?: (sql: string) => void) {
  return drizzle(pool, { schema, ...(onQuery ? { logger: { logQuery: onQuery } } : {}) });
}

/** The typed Drizzle client. */
export type Db = ReturnType<typeof createDb>;
/** Either the database or an open transaction: services accept both. */
export type Executor = Db | Parameters<Parameters<Db['transaction']>[0]>[0];
