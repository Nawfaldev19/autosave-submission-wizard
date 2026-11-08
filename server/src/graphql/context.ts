/** The per-request GraphQL context and its DataLoaders. */

import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { manuscripts, users, type ManuscriptRecord, type UserRecord } from '../db/schema';
import type { Services } from '../domain/submissions';
import type { Viewer } from '../domain/viewer';

/** What every resolver receives. A new one is built for each request. */
export interface Context {
  /** Database, storage, clock and press settings. */
  readonly services: Services;
  /** The signed-in user, or `null` (anonymous, expired or revoked session). */
  readonly viewer: Viewer | null;
  /** Batch loaders, fresh per request so nothing is cached across people. */
  readonly loaders: ReturnType<typeof createLoaders>;
  /** Session cookie changes requested by resolvers; written to the response by a plugin. */
  readonly setCookie: (cookie: string) => void;
  /** The rate-limit key for this client: the socket address, or the trusted x-forwarded-for entry. */
  readonly clientAddress: string;
  /** Signs new session tokens at sign-in. */
  readonly sessionSecret: string;
  /** Whether new session cookies get `Secure`. */
  readonly secureCookies: boolean;
}

function byId<T extends { id: string }>(records: readonly T[], ids: readonly string[]): (T | null)[] {
  const map = new Map(records.map((record) => [record.id, record]));
  return ids.map((id) => map.get(id) ?? null);
}

/**
 * Per-request batch loaders: one query per type, however many submissions a list shows.
 *
 * @param db - The database.
 * @returns Loaders for users (authors and editors) and manuscripts, keyed by id; a missing id loads `null`.
 * @remarks An integration test proves a page of 4 costs the same number of queries as a page of 2.
 */
export function createLoaders(db: Db) {
  return {
    user: new DataLoader<string, UserRecord | null>(async (ids) =>
      byId(
        await db
          .select()
          .from(users)
          .where(inArray(users.id, [...ids])),
        ids,
      ),
    ),
    manuscript: new DataLoader<string, ManuscriptRecord | null>(async (ids) =>
      byId(
        await db
          .select()
          .from(manuscripts)
          .where(inArray(manuscripts.id, [...ids])),
        ids,
      ),
    ),
  };
}
