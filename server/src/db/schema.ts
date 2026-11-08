/**
 * Typed Drizzle table definitions. They mirror db/migrations/*.sql, which stay the
 * source of truth for constraints and indexes (see docs/reference/data-model.md).
 */

import { boolean, date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Which migration files have run. Written only by the migrator. */
export const schemaMigrations = pgTable('schema_migrations', {
  name: text('name').primaryKey(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Accounts: authors and editors. `sessions_valid_after` revokes older session tokens. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['AUTHOR', 'EDITOR'] }).notNull(),
  passwordHash: text('password_hash').notNull(),
  sessionsValidAfter: timestamp('sessions_valid_after', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Uploaded files' metadata. The bytes live in `FileStorage` under `storage_key`. */
export const manuscripts = pgTable('manuscripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  fileName: text('file_name').notNull(),
  storageKey: text('storage_key').notNull(),
  mediaType: text('media_type', { enum: ['application/pdf', 'text/plain'] }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Submissions in every workflow status, with the draft fields and a `version` for optimistic concurrency. */
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').notNull(),
  editorId: uuid('editor_id'),
  status: text('status', { enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'DECLINED'] })
    .notNull()
    .default('DRAFT'),
  version: integer('version').notNull().default(1),
  title: text('title'),
  form: text('form', { enum: ['CHAPBOOK', 'ESSAY', 'COLLECTION'] }),
  synopsis: text('synopsis'),
  wordCount: integer('word_count'),
  season: text('season', { enum: ['SPRING', 'AUTUMN', 'EITHER'] }),
  timeSensitive: boolean('time_sensitive').notNull().default(false),
  scheduleNote: text('schedule_note').notNull().default(''),
  penName: text('pen_name').notNull().default(''),
  bio: text('bio'),
  rightsConfirmed: boolean('rights_confirmed').notNull().default(false),
  manuscriptId: uuid('manuscript_id'),
  decisionNote: text('decision_note'),
  releaseDate: date('release_date', { mode: 'string' }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** In-app messages to authors, written in the same transaction as the decision they announce. */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').notNull(),
  submissionId: uuid('submission_id').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** A record of the `users` table. */
export type UserRecord = typeof users.$inferSelect;
/** A record of the `submissions` table. */
export type SubmissionRecord = typeof submissions.$inferSelect;
/** A record of the `manuscripts` table. */
export type ManuscriptRecord = typeof manuscripts.$inferSelect;
/** A record of the `notifications` table. */
export type NotificationRecord = typeof notifications.$inferSelect;
