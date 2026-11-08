/**
 * The submission domain services: drafts with versioned saves, uploads, every
 * workflow transition, duplication, the editors' keyset queue and the inbox.
 * Resolvers stay thin and call these; every function checks the viewer first.
 */

import {
  declineNoteSchema,
  draftPatchSchema,
  EDITABLE_AFTER_ACCEPTANCE,
  MAX_UPLOAD_BYTES,
  nextStatus,
  readiness,
  releaseDateProblem,
  safeFileName,
  sniffMediaType,
  todayIn,
  type DraftPatch,
  type WorkflowAction,
} from '@submission-wizard/shared';
import { and, desc, eq, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Db, Executor } from '../db/client';
import { manuscripts, notifications, submissions, type SubmissionRecord } from '../db/schema';
import {
  ConflictError,
  IncompleteSubmissionError,
  InvalidTransitionError,
  LockedFieldError,
  NotFoundError,
  UploadRejectedError,
  ValidationError,
} from './errors';
import { acceptedMessage, declinedMessage, notifyAuthor } from './notifications';
import { log } from '../logger';
import type { FileStorage } from './storage';
import { requireRole, requireViewer, type Viewer } from './viewer';

/** What the domain services need from the outside world; tests pass their own clock and storage. */
export interface Services {
  /** The database. */
  readonly db: Db;
  /** Where manuscript bytes live. */
  readonly storage: FileStorage;
  /** Shown in messages to authors. */
  readonly pressName: string;
  /** The IANA zone that decides what "today" is for release dates. */
  readonly pressTimeZone: string;
  /** The clock. */
  readonly now: () => Date;
}

type Status = SubmissionRecord['status'];

/** Who may see a submission: its author always; editors once it has been submitted. */
function visibleTo(viewer: Viewer): SQL {
  return viewer.role === 'EDITOR'
    ? (or(eq(submissions.authorId, viewer.id), ne(submissions.status, 'DRAFT')) as SQL)
    : eq(submissions.authorId, viewer.id);
}

/**
 * Loads one submission the viewer may see: their own, or (for editors) any that is not a draft.
 *
 * @param db - The database or an open transaction.
 * @param viewer - The signed-in viewer.
 * @param id - The submission id; anything that is not a UUID is simply not found.
 * @throws {@link NotSignedInError} without a viewer; {@link NotFoundError} when missing or not visible.
 */
export async function getSubmission(
  db: Executor,
  viewer: Viewer | null,
  id: string,
): Promise<SubmissionRecord> {
  const signedIn = requireViewer(viewer);
  if (!isUuid(id)) throw new NotFoundError();
  const [found] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, id), visibleTo(signedIn)));
  if (!found) throw new NotFoundError();
  return found;
}

/**
 * Whether `value` is a UUID. Checked before any query, because Postgres rejects a
 * malformed uuid with an error instead of finding nothing.
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parsePatch(patch: unknown): DraftPatch {
  const parsed = draftPatchSchema.safeParse(patch);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? ''), message: i.message })),
    );
  }
  return parsed.data;
}

/**
 * Creates a draft owned by the signed-in author.
 *
 * @param patch - Any subset of draft fields; validated by `draftPatchSchema`.
 * @throws {@link ForbiddenError} for editors; {@link ValidationError} for invalid fields.
 * @see docs/reference/features.md (F-02)
 */
export async function createDraft(
  services: Services,
  viewer: Viewer | null,
  patch: unknown,
): Promise<SubmissionRecord> {
  const author = requireRole(viewer, 'AUTHOR');
  const values = parsePatch(patch);
  const [created] = await services.db
    .insert(submissions)
    .values({ ...values, authorId: author.id })
    .returning();
  if (!created) throw new Error('Insert returned no record');
  return created;
}

/**
 * Applies a patch only if the caller saw the latest version (optimistic
 * concurrency). One UPDATE checks the id, owner and version together, so two
 * tabs saving at once cannot silently overwrite each other.
 */
async function updateWithVersion(
  tx: Executor,
  authorId: string,
  id: string,
  version: number,
  values: Partial<typeof submissions.$inferInsert>,
): Promise<SubmissionRecord> {
  const [updated] = await tx
    .update(submissions)
    .set({ ...values, version: sql`${submissions.version} + 1`, updatedAt: sql`now()` })
    .where(and(eq(submissions.id, id), eq(submissions.authorId, authorId), eq(submissions.version, version)))
    .returning();
  if (updated) return updated;
  const [current] = await tx
    .select({ version: submissions.version })
    .from(submissions)
    .where(and(eq(submissions.id, id), eq(submissions.authorId, authorId)));
  throw current ? new ConflictError(current.version) : new NotFoundError();
}

/**
 * Saves a patch to the author's draft, or to the editable fields of an accepted submission.
 *
 * @param version - The version the author started from.
 * @param patch - Any subset of draft fields.
 * @throws {@link ConflictError} when another save came first; {@link LockedFieldError} when an
 * accepted submission's locked fields are touched; {@link InvalidTransitionError} for other statuses.
 * @see docs/explanation/wizard-and-concurrency.md
 */
export async function saveDraft(
  services: Services,
  viewer: Viewer | null,
  id: string,
  version: number,
  patch: unknown,
): Promise<SubmissionRecord> {
  const author = requireRole(viewer, 'AUTHOR');
  const values = parsePatch(patch);
  const existing = await getSubmission(services.db, author, id);
  if (existing.status === 'ACCEPTED') {
    const locked = Object.keys(values).filter(
      (key) => !(EDITABLE_AFTER_ACCEPTANCE as readonly string[]).includes(key),
    );
    if (locked.length > 0) throw new LockedFieldError(locked);
  } else if (existing.status !== 'DRAFT') {
    throw new InvalidTransitionError(existing.status, 'edit');
  }
  return updateWithVersion(services.db, author.id, id, version, values);
}

/** A file received from a multipart request, already read into memory. */
export interface UploadedFile {
  /** The name the browser sent; cleaned before it is stored. */
  readonly name: string;
  /** The file's content. */
  readonly bytes: Uint8Array;
}

/**
 * Stores a manuscript and attaches it to the author's draft, replacing any earlier file.
 *
 * @param version - The version the author started from.
 * @param file - The upload; its type is decided from its content, not its name.
 * @throws {@link UploadRejectedError} for empty, oversized or unsupported files;
 * {@link ConflictError} or {@link NotFoundError} when the versioned update fails.
 * @remarks
 * The bytes are written before the transaction. If the database refuses, the new
 * file is removed. After the commit the replaced file is removed; if that fails,
 * the save still succeeds and the stray file is logged. A crash between the commit
 * and the delete also leaves a stray file (see docs/security/threat-model.md).
 * @see docs/explanation/architecture.md
 */
export async function attachManuscript(
  services: Services,
  viewer: Viewer | null,
  id: string,
  version: number,
  file: UploadedFile,
): Promise<SubmissionRecord> {
  const author = requireRole(viewer, 'AUTHOR');
  const existing = await getSubmission(services.db, author, id);
  if (existing.status !== 'DRAFT') throw new InvalidTransitionError(existing.status, 'edit');
  if (file.bytes.byteLength === 0) throw new UploadRejectedError('That file is empty.');
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES)
    throw new UploadRejectedError('Manuscripts can be up to 5 MB.');
  const mediaType = sniffMediaType(file.bytes);
  if (!mediaType) throw new UploadRejectedError('Upload a PDF or a plain-text (UTF-8) file.');

  const key = await services.storage.save(file.bytes);
  let outcome: { updated: SubmissionRecord; replacedKey: string | null };
  try {
    outcome = await services.db.transaction(async (tx) => {
      const [stored] = await tx
        .insert(manuscripts)
        .values({
          ownerId: author.id,
          fileName: safeFileName(file.name),
          storageKey: key,
          mediaType,
          sizeBytes: file.bytes.byteLength,
        })
        .returning();
      if (!stored) throw new Error('Insert returned no record');
      const updated = await updateWithVersion(tx, author.id, id, version, { manuscriptId: stored.id });
      if (!existing.manuscriptId) return { updated, replacedKey: null };
      // The versioned update succeeded, so `existing` was the latest state: its file is the one replaced.
      const [replaced] = await tx
        .delete(manuscripts)
        .where(eq(manuscripts.id, existing.manuscriptId))
        .returning({ storageKey: manuscripts.storageKey });
      return { updated, replacedKey: replaced?.storageKey ?? null };
    });
  } catch (error) {
    // The database rejected the change, so the stored file would be an orphan.
    await services.storage.remove(key);
    throw error;
  }
  if (outcome.replacedKey) {
    try {
      await services.storage.remove(outcome.replacedKey);
    } catch {
      // The change is committed, so the author must not see a failure for it.
      log('error', 'replaced manuscript file not removed', { storageKey: outcome.replacedKey });
    }
  }
  return outcome.updated;
}

/** Extra input some workflow moves need. */
export interface TransitionInput {
  /** When given, the move is refused with {@link ConflictError} unless it matches the stored version. */
  readonly version?: number;
  /** Required to accept. */
  readonly releaseDate?: string;
  /** Required to decline. */
  readonly note?: string;
}

/**
 * Every status change goes through here: lock the record, ask the shared
 * workflow table whether the move is allowed, apply the action's own rules,
 * and record any notification in the same transaction.
 *
 * @param action - The move; see `TRANSITIONS` in shared/src/workflow.ts.
 * @param input - The version, release date or note the move needs.
 * @throws {@link NotFoundError}, {@link ConflictError}, {@link InvalidTransitionError} (wrong role,
 * wrong status, or another editor's claim), {@link IncompleteSubmissionError} (submit) or
 * {@link ValidationError} (release date or note).
 * @remarks
 * `SELECT … FOR UPDATE` serialises concurrent moves on one submission, so of
 * two editors claiming at once exactly one wins.
 * @see docs/adr/0004-workflow-as-a-table-invariants-in-the-database.md
 */
export async function transition(
  services: Services,
  viewer: Viewer | null,
  id: string,
  action: WorkflowAction,
  input: TransitionInput = {},
): Promise<SubmissionRecord> {
  const actor = requireViewer(viewer);
  if (!isUuid(id)) throw new NotFoundError();
  return services.db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, id), visibleTo(actor)))
      .for('update');
    if (!current) throw new NotFoundError();
    if (input.version !== undefined && input.version !== current.version)
      throw new ConflictError(current.version);

    const verdict = nextStatus(current.status, action, actor.role);
    if (!verdict.ok) throw new InvalidTransitionError(current.status, action);

    const changes = changesFor(services, current, action, input, actor);
    const [updated] = await tx
      .update(submissions)
      .set({
        ...changes,
        status: verdict.to,
        version: sql`${submissions.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(submissions.id, id))
      .returning();
    if (!updated) throw new NotFoundError();

    if (action === 'accept') await notifyAuthor(tx, updated, acceptedMessage(updated, services.pressName));
    if (action === 'decline') await notifyAuthor(tx, updated, declinedMessage(updated, services.pressName));
    return updated;
  });
}

function changesFor(
  services: Services,
  current: SubmissionRecord,
  action: WorkflowAction,
  input: TransitionInput,
  actor: Viewer,
): Partial<typeof submissions.$inferInsert> {
  const now = services.now();
  switch (action) {
    case 'submit': {
      const issues = readiness({ ...current, hasManuscript: current.manuscriptId !== null });
      if (issues.length > 0) throw new IncompleteSubmissionError(issues);
      return { submittedAt: now };
    }
    case 'withdraw':
      return { submittedAt: null };
    case 'claim':
      return { editorId: actor.id };
    case 'accept': {
      const releaseDate = input.releaseDate ?? '';
      const problem = releaseDateProblem(releaseDate, todayIn(services.pressTimeZone, now));
      if (problem) throw new ValidationError([{ field: 'releaseDate', message: problem }]);
      if (current.editorId !== actor.id) throw new InvalidTransitionError(current.status, 'accept');
      return { releaseDate, decidedAt: now };
    }
    case 'decline': {
      const note = declineNoteSchema.safeParse(input.note ?? '');
      if (!note.success) {
        throw new ValidationError([{ field: 'note', message: note.error.issues[0]?.message ?? '' }]);
      }
      if (current.editorId !== actor.id) throw new InvalidTransitionError(current.status, 'decline');
      return { decisionNote: note.data, decidedAt: now };
    }
    case 'revise':
      return {
        editorId: null,
        decisionNote: null,
        decidedAt: null,
        submittedAt: null,
        rightsConfirmed: false,
      };
  }
}

/** Starts a new draft from an earlier submission: text fields only, never the file or the status. */
export async function duplicateSubmission(
  services: Services,
  viewer: Viewer | null,
  id: string,
): Promise<SubmissionRecord> {
  const author = requireRole(viewer, 'AUTHOR');
  // Authors only ever see their own work, so this also checks ownership.
  const source = await getSubmission(services.db, author, id);
  const [copy] = await services.db
    .insert(submissions)
    .values({
      authorId: author.id,
      title: source.title,
      form: source.form,
      synopsis: source.synopsis,
      wordCount: source.wordCount,
      season: source.season,
      timeSensitive: source.timeSensitive,
      scheduleNote: source.scheduleNote,
      penName: source.penName,
      bio: source.bio,
    })
    .returning();
  if (!copy) throw new Error('Insert returned no record');
  return copy;
}

/**
 * The viewer's own submissions, most recently changed first.
 *
 * @throws {@link NotSignedInError} without a viewer.
 */
export async function listOwn(db: Db, viewer: Viewer | null): Promise<SubmissionRecord[]> {
  const author = requireViewer(viewer);
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.authorId, author.id))
    .orderBy(desc(submissions.updatedAt));
}

/** One page of the editors' queue. */
export interface QueuePage {
  /** The submissions on this page, newest first. */
  readonly nodes: SubmissionRecord[];
  /** Whether older submissions follow. */
  readonly hasNextPage: boolean;
  /** Pass as `after` to read the next page; `null` for an empty page. */
  readonly endCursor: string | null;
}

const QUEUE_STATUSES: readonly Status[] = ['SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'DECLINED'];

/**
 * `timestamptz` keeps microseconds but a JavaScript Date keeps milliseconds, so
 * the cursor's time is formatted by Postgres itself. A millisecond cursor would
 * skip records whose time was written by SQL (`now()`) rather than by the app.
 */
const cursorTime = sql<string>`to_char(${submissions.submittedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const CURSOR_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

function encodeCursor(time: string, id: string): string {
  return Buffer.from(`${time}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string): { time: string; id: string } {
  const [time, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  if (!time || !CURSOR_TIME.test(time) || !id || !isUuid(id)) {
    throw new ValidationError([{ field: 'after', message: 'That page cursor is not valid.' }]);
  }
  return { time, id };
}

/**
 * The editors' queue, newest first, with keyset pagination: the cursor holds
 * the last (submitted_at, id) seen, so pages stay stable while new work arrives.
 *
 * @param options - `statuses` (empty means every non-draft status), `first` (clamped to 1–50)
 * and `after` (a cursor from a previous page).
 * @throws {@link ForbiddenError} for authors; {@link ValidationError} for a malformed cursor.
 * @see docs/adr/0005-keyset-pagination-for-the-queue.md
 */
export async function reviewQueue(
  db: Db,
  viewer: Viewer | null,
  options: { statuses?: readonly Status[]; first: number; after?: string | null },
): Promise<QueuePage> {
  requireRole(viewer, 'EDITOR');
  const statuses = options.statuses?.length
    ? options.statuses.filter((s) => QUEUE_STATUSES.includes(s))
    : QUEUE_STATUSES;
  const first = Math.min(Math.max(options.first, 1), 50);
  const conditions: SQL[] = [inArray(submissions.status, [...statuses])];
  if (options.after) {
    const { time, id } = decodeCursor(options.after);
    conditions.push(
      sql`(${submissions.submittedAt}, ${submissions.id}) < (${time}::timestamptz, ${id}::uuid)`,
    );
  }
  const found = await db
    .select({ submission: submissions, cursorTime })
    .from(submissions)
    .where(and(...conditions))
    .orderBy(desc(submissions.submittedAt), desc(submissions.id))
    .limit(first + 1);
  const page = found.slice(0, first);
  const last = page.at(-1);
  return {
    nodes: page.map((r) => r.submission),
    hasNextPage: found.length > first,
    endCursor: last ? encodeCursor(last.cursorTime, last.submission.id) : null,
  };
}

/**
 * Marks every unread notification of the viewer as read.
 *
 * @param now - The read time to record.
 * @returns How many notifications changed.
 * @throws {@link NotSignedInError} without a viewer.
 */
export async function markNotificationsRead(db: Db, viewer: Viewer | null, now: Date): Promise<number> {
  const signedIn = requireViewer(viewer);
  const changed = await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.recipientId, signedIn.id), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return changed.length;
}

/**
 * The viewer's 50 most recent notifications, newest first.
 *
 * @throws {@link NotSignedInError} without a viewer.
 */
export async function listNotifications(db: Db, viewer: Viewer | null) {
  const signedIn = requireViewer(viewer);
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, signedIn.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}
