/**
 * The submission rules shared by the browser and the server. The wizard uses
 * these schemas for instant feedback; the server runs the same ones again, so
 * nothing the browser skips can get through.
 */

import { z } from 'zod';

/** The kinds of work the press reads. */
export const FORMS = ['CHAPBOOK', 'ESSAY', 'COLLECTION'] as const;
/** One kind of work, such as `CHAPBOOK`. */
export type Form = (typeof FORMS)[number];

/** The publishing lists a submission can be considered for. */
export const SEASONS = ['SPRING', 'AUTUMN', 'EITHER'] as const;
/** One publishing list, such as `SPRING`. */
export type Season = (typeof SEASONS)[number];

/** Every workflow status, in workflow order. */
export const STATUSES = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'DECLINED'] as const;
/** One workflow status, such as `IN_REVIEW`. */
export type SubmissionStatus = (typeof STATUSES)[number];

/** How each kind of work is labelled in forms and summaries. */
export const FORM_LABEL: Readonly<Record<Form, string>> = {
  CHAPBOOK: 'Chapbook (poetry, up to 40 pages)',
  ESSAY: 'Long-form essay',
  COLLECTION: 'Short-story collection',
};

/** How each publishing list is labelled in forms and summaries. */
export const SEASON_LABEL: Readonly<Record<Season, string>> = {
  SPRING: 'Spring list',
  AUTUMN: 'Autumn list',
  EITHER: 'Either list',
};

/** Step 1 (Basics): title, kind of work and synopsis. */
export const basicsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give your work a title.')
    .max(120, 'Keep the title to 120 characters or fewer.'),
  form: z.enum(FORMS, { error: 'Choose what kind of work this is.' }),
  synopsis: z
    .string()
    .trim()
    .min(50, 'The synopsis needs at least 50 characters.')
    .max(2000, 'Keep the synopsis to 2,000 characters or fewer.'),
});

/** Step 2 (Manuscript): the word count. The file itself is checked by {@link readiness}. */
export const manuscriptDetailsSchema = z.object({
  wordCount: z
    .number({ error: 'Enter the word count as a number.' })
    .int('Use a whole number.')
    .min(500, 'We read manuscripts of at least 500 words.')
    .max(120_000, 'We read manuscripts of up to 120,000 words.'),
});

/** Step 3 (Schedule): the publishing list, whether the work is tied to a date, and a timing note. */
export const scheduleSchema = z.object({
  season: z.enum(SEASONS, { error: 'Choose a list.' }),
  timeSensitive: z.boolean(),
  scheduleNote: z.string().trim().max(400, 'Keep the note to 400 characters or fewer.'),
});

/** Step 4 (About you): pen name, short biography and the rights confirmation. */
export const aboutSchema = z.object({
  penName: z.string().trim().max(80, 'Keep the pen name to 80 characters or fewer.'),
  bio: z
    .string()
    .trim()
    .min(20, 'Tell us a little about yourself (20 characters or more).')
    .max(600, 'Keep the biography to 600 characters or fewer.'),
  rightsConfirmed: z.boolean(),
});

/** The longest note an editor may send with a decline. */
export const MAX_DECLINE_NOTE_LENGTH = 2000;

/**
 * An editor's note when declining: the author reads it, so it must say something.
 *
 * @see docs/reference/features.md (F-11)
 */
export const declineNoteSchema = z
  .string()
  .trim()
  .min(10, 'Write a note for the author (10 characters or more).')
  .max(MAX_DECLINE_NOTE_LENGTH, 'Keep the note to 2,000 characters or fewer.');

/**
 * Every field a draft can hold, all optional: drafts are allowed to be incomplete.
 *
 * @remarks
 * `strict()` refuses unknown keys, so a client cannot set status, version,
 * author or editor through a draft save (mass assignment).
 */
export const draftPatchSchema = basicsSchema
  .partial()
  .extend(manuscriptDetailsSchema.partial().shape)
  .extend(scheduleSchema.partial().shape)
  .extend(aboutSchema.partial().shape)
  .strict();
/** A validated, possibly partial set of draft fields. */
export type DraftPatch = z.infer<typeof draftPatchSchema>;

/** The five wizard steps, in order. The slug is the URL segment. */
export const STEPS = [
  { number: 1, slug: 'basics', title: 'Basics' },
  { number: 2, slug: 'manuscript', title: 'Manuscript' },
  { number: 3, slug: 'schedule', title: 'Schedule' },
  { number: 4, slug: 'about', title: 'About you' },
  { number: 5, slug: 'review', title: 'Review and submit' },
] as const;
/** A wizard step's URL segment, such as `manuscript`. */
export type StepSlug = (typeof STEPS)[number]['slug'];

/**
 * Fields an author may still change after acceptance. Everything else is locked.
 *
 * @see docs/reference/features.md (F-09)
 */
export const EDITABLE_AFTER_ACCEPTANCE = [
  'penName',
  'bio',
  'synopsis',
] as const satisfies readonly (keyof DraftPatch)[];

type EditableAfterAcceptance = (typeof EDITABLE_AFTER_ACCEPTANCE)[number];

/**
 * What an accepted submission no longer lets its author change: every other
 * draft field, plus `file` (the manuscript), which cannot be replaced once submitted.
 */
export const LOCKED_AFTER_ACCEPTANCE: readonly (
  Exclude<keyof DraftPatch, EditableAfterAcceptance> | 'file'
)[] = [
  ...draftPatchSchema
    .keyof()
    .options.filter(
      (field): field is Exclude<keyof DraftPatch, EditableAfterAcceptance> =>
        !(EDITABLE_AFTER_ACCEPTANCE as readonly string[]).includes(field),
    ),
  'file',
];

/** The parts of a stored submission that {@link readiness} needs. */
export interface DraftSnapshot {
  readonly title: string | null;
  readonly form: Form | null;
  readonly synopsis: string | null;
  readonly wordCount: number | null;
  readonly season: Season | null;
  readonly timeSensitive: boolean;
  readonly scheduleNote: string;
  readonly penName: string;
  readonly bio: string | null;
  readonly rightsConfirmed: boolean;
  readonly hasManuscript: boolean;
}

/** One thing still missing before a draft can be submitted. */
export interface ReadinessIssue {
  /** The wizard step that holds the field. */
  readonly step: StepSlug;
  /** The field to fix, as the forms name it (`file` is the manuscript upload). */
  readonly field: string;
  /** A sentence telling the author what to do. */
  readonly message: string;
}

function issuesFor(step: StepSlug, schema: z.ZodType, value: unknown): ReadinessIssue[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    step,
    field: String(issue.path[0] ?? ''),
    message: issue.message,
  }));
}

/**
 * Everything still missing before a draft can be submitted, in wizard order.
 * The review step shows this list with links back to each field; the server
 * refuses to submit unless it is empty.
 *
 * @param draft - The stored draft's fields, plus whether a manuscript is attached.
 * @returns The issues, ordered by step and, within a step, by field order. Empty when ready.
 * @example
 * ```ts
 * // `draft` has a title and nothing else.
 * readiness(draft)[0];
 * // { step: 'basics', field: 'form', message: 'Choose what kind of work this is.' }
 * ```
 * @see docs/reference/features.md (F-03)
 */
export function readiness(draft: DraftSnapshot): ReadinessIssue[] {
  const issues = [
    ...issuesFor('basics', basicsSchema, {
      title: draft.title ?? '',
      form: draft.form ?? undefined,
      synopsis: draft.synopsis ?? '',
    }),
    ...issuesFor('manuscript', manuscriptDetailsSchema, { wordCount: draft.wordCount ?? undefined }),
    ...issuesFor('schedule', scheduleSchema, {
      season: draft.season ?? undefined,
      timeSensitive: draft.timeSensitive,
      scheduleNote: draft.scheduleNote,
    }),
    ...issuesFor('about', aboutSchema, {
      penName: draft.penName,
      bio: draft.bio ?? '',
      rightsConfirmed: draft.rightsConfirmed,
    }),
  ];
  if (!draft.hasManuscript) {
    issues.push({
      step: 'manuscript',
      field: 'file',
      message: 'Upload your manuscript as a PDF or plain-text file.',
    });
  }
  if (!draft.rightsConfirmed) {
    issues.push({
      step: 'about',
      field: 'rightsConfirmed',
      message: 'Confirm that you hold the rights to this work.',
    });
  }
  return orderByStep(issues);
}

/** Stable sort, so issues keep their field order within each step. */
function orderByStep(issues: ReadinessIssue[]): ReadinessIssue[] {
  const position = new Map(STEPS.map((step, index) => [step.slug, index]));
  return [...issues].sort((a, b) => (position.get(a.step) ?? 0) - (position.get(b.step) ?? 0));
}
