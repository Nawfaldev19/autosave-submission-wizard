/**
 * A small migrator for the plain SQL files in `migrations/`, plus the helpers the
 * command-line scripts share. Run directly, it creates the database if needed and migrates it.
 */

import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config';
import { connectionConfig, createPool, DEFAULT_DATABASE } from './client';
import { schemaMigrations } from './schema';
import { log } from '../logger';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);

/**
 * Applies every .sql file in migrations/ that has not run yet, in name order,
 * each inside its own transaction. Small on purpose: plain SQL is the source of truth.
 *
 * @param pool - A pool connected to the target database.
 * @returns The names of the files applied by this call.
 * @throws The database error of the first failing file, after rolling that file back.
 * @see docs/reference/data-model.md
 */
export async function migrate(pool: pg.Pool): Promise<string[]> {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const done = new Set((await drizzle(pool).select().from(schemaMigrations)).map((m) => m.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  return applied;
}

/** Creates the database when it does not exist yet (local development and tests). */
export async function ensureDatabase(name: string): Promise<void> {
  const admin = new pg.Client(connectionConfig('postgres'));
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name.replace(/"/g, '')}"`);
  } catch (error) {
    // 42P04: the database already exists, which is the usual case.
    if ((error as { code?: string }).code !== '42P04') throw error;
  } finally {
    await admin.end();
  }
}

/** The database the CLI scripts target: SUBMISSION_WIZARD_DATABASE, else DATABASE_URL's own, else the default. */
export async function ensureConfiguredDatabase(): Promise<void> {
  const name = config.databaseName ?? (config.databaseUrl ? undefined : DEFAULT_DATABASE);
  if (name) await ensureDatabase(name);
}

/** True when `moduleUrl` is the script node was started with (paths with spaces included). */
export function isEntryPoint(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return entry !== undefined && moduleUrl === pathToFileURL(entry).href;
}

if (isEntryPoint(import.meta.url)) {
  await ensureConfiguredDatabase();
  const pool = createPool();
  const applied = await migrate(pool);
  log('info', 'migrations applied', { applied });
  await pool.end();
}
