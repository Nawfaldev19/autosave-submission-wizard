import { describe, expect, it } from 'vitest';
import {
  addDays,
  availableActions,
  draftPatchSchema,
  formatCalendarDate,
  isIsoDate,
  nextStatus,
  readiness,
  declineNoteSchema,
  releaseDateProblem,
  safeFileName,
  sniffMediaType,
  STATUSES,
  ACTIONS,
  todayIn,
  type DraftSnapshot,
} from '../src';

const complete: DraftSnapshot = {
  title: 'Salt Ledger',
  form: 'CHAPBOOK',
  synopsis: 'Twenty-four short poems kept like entries in a harbour ledger, one for every tide.',
  wordCount: 6000,
  season: 'SPRING',
  timeSensitive: false,
  scheduleNote: '',
  penName: '',
  bio: 'Writes about coastlines and the people who keep them.',
  rightsConfirmed: true,
  hasManuscript: true,
};

describe('readiness', () => {
  it('is empty for a complete draft', () => {
    expect(readiness(complete)).toEqual([]);
  });

  it('lists every gap in wizard order, with the step and field', () => {
    const issues = readiness({
      ...complete,
      title: '',
      wordCount: null,
      hasManuscript: false,
      rightsConfirmed: false,
      bio: null,
    });
    expect(issues.map((i) => `${i.step}.${i.field}`)).toEqual([
      'basics.title',
      'manuscript.wordCount',
      'manuscript.file',
      'about.bio',
      'about.rightsConfirmed',
    ]);
  });

  it('applies the same limits as the step schemas', () => {
    expect(readiness({ ...complete, synopsis: 'too short' })[0]?.message).toMatch(/at least 50/);
    expect(readiness({ ...complete, wordCount: 200_000 })[0]?.message).toMatch(/up to 120,000/);
  });
});

describe('draftPatchSchema', () => {
  it('accepts partial drafts and trims text', () => {
    expect(draftPatchSchema.parse({ title: '  Salt Ledger  ' })).toEqual({ title: 'Salt Ledger' });
  });

  it('rejects unknown fields and out-of-range values', () => {
    expect(draftPatchSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(false);
    expect(draftPatchSchema.safeParse({ wordCount: 12.5 }).success).toBe(false);
    expect(draftPatchSchema.safeParse({ title: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('workflow', () => {
  it('allows exactly the transitions in the table, for the right role', () => {
    const allowed: string[] = [];
    for (const status of STATUSES) {
      for (const action of ACTIONS) {
        for (const role of ['AUTHOR', 'EDITOR'] as const) {
          const result = nextStatus(status, action, role);
          if (result.ok) allowed.push(`${status} -${action}(${role})-> ${result.to}`);
        }
      }
    }
    expect(allowed.sort()).toEqual(
      [
        'DRAFT -submit(AUTHOR)-> SUBMITTED',
        'SUBMITTED -withdraw(AUTHOR)-> DRAFT',
        'SUBMITTED -claim(EDITOR)-> IN_REVIEW',
        'IN_REVIEW -accept(EDITOR)-> ACCEPTED',
        'IN_REVIEW -decline(EDITOR)-> DECLINED',
        'DECLINED -revise(AUTHOR)-> DRAFT',
      ].sort(),
    );
  });

  it('explains why a move is refused', () => {
    expect(nextStatus('DRAFT', 'claim', 'AUTHOR')).toEqual({ ok: false, reason: 'wrong-role' });
    expect(nextStatus('ACCEPTED', 'claim', 'EDITOR')).toEqual({ ok: false, reason: 'wrong-status' });
  });

  it('lists the buttons each role should see', () => {
    expect(availableActions('SUBMITTED', 'AUTHOR')).toEqual(['withdraw']);
    expect(availableActions('SUBMITTED', 'EDITOR')).toEqual(['claim']);
    expect(availableActions('ACCEPTED', 'EDITOR')).toEqual([]);
  });
});

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('28/02/2026')).toBe(false);
  });

  it("finds today in the press's zone, not the server's", () => {
    const lateEvening = new Date('2026-03-10T23:30:00Z');
    expect(todayIn('Europe/Dublin', lateEvening)).toBe('2026-03-10');
    expect(todayIn('Asia/Tokyo', lateEvening)).toBe('2026-03-11');
    expect(todayIn('America/Los_Angeles', new Date('2026-01-01T05:00:00Z'))).toBe('2025-12-31');
  });

  it('requires release dates 30 days to two years out', () => {
    const today = '2026-03-10';
    expect(releaseDateProblem(addDays(today, 29), today)).toMatch(/at least 30 days/);
    expect(releaseDateProblem(addDays(today, 30), today)).toBeNull();
    expect(releaseDateProblem(addDays(today, 731), today)).toMatch(/within two years/);
    expect(releaseDateProblem('soon', today)).toMatch(/real date/);
  });

  it('formats a calendar date without shifting it', () => {
    expect(formatCalendarDate('2026-04-09')).toBe('Thursday 9 April 2026');
  });
});

describe('decline notes', () => {
  it('needs 10 to 2,000 characters after trimming', () => {
    expect(declineNoteSchema.safeParse('   No.     ').success).toBe(false);
    expect(declineNoteSchema.safeParse(' Not for us. ').data).toBe('Not for us.');
    expect(declineNoteSchema.safeParse('x'.repeat(2000)).success).toBe(true);
    expect(declineNoteSchema.safeParse('x'.repeat(2001)).success).toBe(false);
  });
});

describe('uploads', () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  it('recognises PDFs and UTF-8 text by content, not name', () => {
    expect(sniffMediaType(bytes('%PDF-1.7 rest'))).toBe('application/pdf');
    expect(sniffMediaType(bytes('Plain words, ünïcode too'))).toBe('text/plain');
  });

  it('rejects binaries, empty files and invalid UTF-8', () => {
    expect(sniffMediaType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
    expect(sniffMediaType(new Uint8Array([]))).toBeNull();
    expect(sniffMediaType(new Uint8Array([0xff, 0xfe, 0x41]))).toBeNull();
  });

  it('reads the whole file, so text followed by binary or a cut-off character is refused', () => {
    const text = bytes('A line of verse.\n'.repeat(400));
    const tail = new Uint8Array(text.length + 2);
    tail.set(text);
    tail.set([0xc3, 0x28], text.length);
    expect(text.length).toBeGreaterThan(4096);
    expect(sniffMediaType(text)).toBe('text/plain');
    expect(sniffMediaType(tail)).toBeNull();
    expect(sniffMediaType(bytes('café').subarray(0, 4))).toBeNull();
  });

  it('keeps file names display-safe', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('My <Novel>?.pdf')).toBe('My Novel.pdf');
    expect(safeFileName('.hidden')).toBe('manuscript.hidden');
    expect(safeFileName('')).toBe('manuscript');
  });
});
