/** Demo data loader (`npm run db:setup`). Empties every table and the storage folder first. */

import { addDays, todayIn } from '@submission-wizard/shared';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../auth/password';
import { config } from '../config';
import { FileStorage } from '../domain/storage';
import { log } from '../logger';
import { createDb, createPool, type Db } from './client';
import { ensureConfiguredDatabase, isEntryPoint, migrate } from './migrate';
import { manuscripts, notifications, submissions, users } from './schema';

/**
 * Demo data for Larkspur Press. Every person and work is invented; every email
 * uses the reserved example.com domain. Password for all accounts: submission-wizard-demo-pass
 */
export const DEMO_PASSWORD = 'submission-wizard-demo-pass';

const SAMPLE_PDF = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 320 160] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 52>> stream
BT /F1 16 Tf 24 80 Td (A sample manuscript page) Tj ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
trailer <</Root 1 0 R>>
%%EOF
`;

const SAMPLE_TEXT =
  'Tidewater Hymns\n\nThe estuary keeps its own hours.\nWe learned them slowly, the way you learn a neighbour.\n';

/**
 * Replaces all data with the demo accounts, submissions and one message.
 *
 * @param db - The target database, already migrated.
 * @param storage - Manuscript storage; it is emptied before the sample files are written.
 * @param now - The instant the demo's relative times are measured from.
 * @remarks
 * Destructive by design: it truncates every table. The command-line entry point
 * accepts `--if-empty` so container start-up seeds only once.
 */
export async function seed(db: Db, storage: FileStorage, now = new Date()): Promise<void> {
  await db.execute('TRUNCATE notifications, submissions, manuscripts, users CASCADE');
  // The truncated manuscripts' files would otherwise stay on disk with nothing pointing at them.
  await storage.clear();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [wren, teo, hollis, june] = await db
    .insert(users)
    .values([
      { email: 'wren@example.com', name: 'Wren Calloway', role: 'AUTHOR', passwordHash },
      { email: 'teo@example.com', name: 'Teodor Lindqvist', role: 'AUTHOR', passwordHash },
      { email: 'hollis@example.com', name: 'Hollis Beaumont', role: 'EDITOR', passwordHash },
      { email: 'june@example.com', name: 'June Haldane', role: 'EDITOR', passwordHash },
    ])
    .returning();
  if (!wren || !teo || !hollis || !june) throw new Error('Seeding users failed');

  async function manuscript(
    ownerId: string,
    fileName: string,
    content: string,
    mediaType: 'application/pdf' | 'text/plain',
  ) {
    const bytes = new TextEncoder().encode(content);
    const storageKey = await storage.save(bytes);
    const [file] = await db
      .insert(manuscripts)
      .values({ ownerId, fileName, storageKey, mediaType, sizeBytes: bytes.byteLength })
      .returning();
    if (!file) throw new Error('Seeding manuscripts failed');
    return file.id;
  }

  const hours = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const today = todayIn(config.pressTimeZone, now);
  const bio = 'Writes about coastlines, small towns and the people who keep them going.';

  await db.insert(submissions).values([
    {
      authorId: wren.id,
      title: 'Salt Ledger',
      form: 'CHAPBOOK',
      synopsis:
        'Twenty-four short poems kept like entries in a harbour master’s ledger, one for each tide of a winter week.',
      updatedAt: hours(2),
    },
    {
      authorId: wren.id,
      status: 'SUBMITTED',
      title: 'Tidewater Hymns',
      form: 'CHAPBOOK',
      synopsis:
        'Poems written along an estuary over one year, tracing how a small community reads the water and each other.',
      wordCount: 6200,
      season: 'SPRING',
      bio,
      rightsConfirmed: true,
      manuscriptId: await manuscript(wren.id, 'tidewater-hymns.txt', SAMPLE_TEXT, 'text/plain'),
      submittedAt: hours(30),
      updatedAt: hours(30),
    },
    {
      authorId: wren.id,
      editorId: hollis.id,
      status: 'ACCEPTED',
      title: 'The Lantern Year',
      form: 'ESSAY',
      synopsis:
        'A long essay about keeping a community lantern-making workshop alive through a hard winter, and what it taught the town.',
      wordCount: 14800,
      season: 'AUTUMN',
      bio,
      rightsConfirmed: true,
      manuscriptId: await manuscript(wren.id, 'the-lantern-year.pdf', SAMPLE_PDF, 'application/pdf'),
      releaseDate: addDays(today, 120),
      submittedAt: hours(24 * 40),
      decidedAt: hours(24 * 20),
      updatedAt: hours(24 * 20),
    },
    {
      authorId: teo.id,
      status: 'SUBMITTED',
      title: 'Small Engines',
      form: 'COLLECTION',
      synopsis:
        'Nine stories set in a repair shop where every broken thing arrives with somebody’s history attached to it.',
      wordCount: 41000,
      season: 'EITHER',
      bio: 'Former bicycle mechanic, now writing about machines and the people who refuse to throw them away.',
      rightsConfirmed: true,
      manuscriptId: await manuscript(teo.id, 'small-engines.pdf', SAMPLE_PDF, 'application/pdf'),
      submittedAt: hours(5),
      updatedAt: hours(5),
    },
    {
      authorId: teo.id,
      editorId: hollis.id,
      status: 'IN_REVIEW',
      title: 'Allotment Weather',
      form: 'ESSAY',
      synopsis:
        'Notes from three seasons on a shared allotment, about soil, patience, and the arguments that grow between neighbours.',
      wordCount: 9800,
      season: 'SPRING',
      bio: 'Former bicycle mechanic, now writing about machines and the people who refuse to throw them away.',
      rightsConfirmed: true,
      manuscriptId: await manuscript(teo.id, 'allotment-weather.txt', SAMPLE_TEXT, 'text/plain'),
      submittedAt: hours(72),
      updatedAt: hours(48),
    },
  ]);

  const [accepted] = await db.select().from(submissions).where(eq(submissions.title, 'The Lantern Year'));
  if (accepted) {
    await db.insert(notifications).values({
      recipientId: wren.id,
      submissionId: accepted.id,
      subject: 'Accepted: The Lantern Year',
      body: 'We would love to publish The Lantern Year. An editor from Larkspur Press will be in touch about the next steps.',
      createdAt: hours(24 * 20),
    });
  }
  log('info', 'seeded demo data', { users: 4, submissions: 5 });
}

if (isEntryPoint(import.meta.url)) {
  await ensureConfiguredDatabase();
  const pool = createPool();
  await migrate(pool);
  // `--if-empty` lets container start-up seed once without wiping later work.
  const db = createDb(pool);
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (process.argv.includes('--if-empty') && existing.length > 0) {
    log('info', 'database already has data; not seeding');
  } else {
    await seed(db, new FileStorage(config.storageDir));
  }
  await pool.end();
}
