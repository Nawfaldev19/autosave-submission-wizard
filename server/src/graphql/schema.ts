/**
 * The code-first GraphQL schema. Every type, field, argument, enum value and
 * input field carries a description, so the committed SDL documents the API
 * (a test enforces it). Resolvers stay thin and call the domain services.
 */

import {
  ACTIONS,
  availableActions,
  FORMS,
  LOCKED_AFTER_ACCEPTANCE,
  MAX_UPLOAD_BYTES,
  readiness,
  ROLES,
  SEASONS,
  STATUSES,
  STEPS,
  todayIn,
  type Form as FormName,
  type Role as RoleName,
  type Season as SeasonName,
  type StepSlug as StepName,
  type SubmissionStatus as StatusName,
  type WorkflowAction as ActionName,
} from '@submission-wizard/shared';
import { GraphQLError } from 'graphql';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '../auth/session';
import {
  type ManuscriptRecord,
  type NotificationRecord,
  type SubmissionRecord,
  type UserRecord,
} from '../db/schema';
import {
  ConflictError,
  ForbiddenError,
  IncompleteSubmissionError,
  InvalidCredentialsError,
  InvalidTransitionError,
  LockedFieldError,
  NotFoundError,
  NotSignedInError,
  UploadRejectedError,
  ValidationError,
} from '../domain/errors';
import * as auth from '../domain/auth';
import * as submissionService from '../domain/submissions';
import { builder } from './builder';

/** Enum values with a description each; the record type makes a missing description a type error. */
function describedValues<const T extends string>(
  names: readonly T[],
  descriptions: Readonly<Record<T, string>>,
): Record<T, { description: string }> {
  return Object.fromEntries(names.map((name) => [name, { description: descriptions[name] }])) as Record<
    T,
    { description: string }
  >;
}

type ErrorClass = new (...args: never[]) => Error;

/**
 * The `errors` option for a field: the expected error classes, plus descriptions
 * for the result union, the success type and its `data` field that the errors plugin generates.
 */
function resultOf(operation: string, data: string, types: ErrorClass[]) {
  return {
    types,
    union: { description: `The result of ${operation}: the success type, or one of the expected errors.` },
    result: { description: `${operation} succeeded; \`data\` holds the result.` },
    dataField: { description: data },
  };
}

// ---------------------------------------------------------------- scalars

builder.scalarType('Date', {
  description: 'A calendar date, YYYY-MM-DD, with no time zone.',
  serialize: (value) => value,
  parseValue: (value) => {
    if (typeof value !== 'string') throw new GraphQLError('Date must be a YYYY-MM-DD string');
    return value;
  },
});

builder.scalarType('DateTime', {
  description: 'An instant, as an ISO 8601 string in UTC. Output only.',
  serialize: (value) => value.toISOString(),
  parseValue: () => {
    throw new GraphQLError('DateTime is an output-only type');
  },
});

builder.scalarType('File', {
  description: 'A file sent with the GraphQL multipart request specification.',
  serialize: () => {
    throw new GraphQLError('File is an input-only type');
  },
  parseValue: (value) => value as File,
});

// ---------------------------------------------------------------- enums

const SubmissionStatus = builder.enumType('SubmissionStatus', {
  description: 'Where a submission is in the editorial workflow.',
  values: describedValues<StatusName>(STATUSES, {
    DRAFT: 'Being prepared by its author; only the author can see it.',
    SUBMITTED: 'Sent to the press and waiting for an editor to claim it.',
    IN_REVIEW: 'Claimed by an editor, who alone may decide it.',
    ACCEPTED: 'Accepted with a release date; only a few fields stay editable.',
    DECLINED: 'Declined with a note; the author may revise it into a new draft.',
  }),
});
const Form = builder.enumType('Form', {
  description: 'The kind of work.',
  values: describedValues<FormName>(FORMS, {
    CHAPBOOK: 'A poetry chapbook of up to 40 pages.',
    ESSAY: 'A long-form essay.',
    COLLECTION: 'A short-story collection.',
  }),
});
const Season = builder.enumType('Season', {
  description: 'The publishing list a submission is considered for.',
  values: describedValues<SeasonName>(SEASONS, {
    SPRING: 'The spring list.',
    AUTUMN: 'The autumn list.',
    EITHER: 'Either list; the press chooses.',
  }),
});
const Role = builder.enumType('Role', {
  description: 'What kind of account a user has.',
  values: describedValues<RoleName>(ROLES, {
    AUTHOR: 'Prepares and submits their own work, and reads decisions about it.',
    EDITOR: 'Works through the queue: claims submissions and accepts or declines them.',
  }),
});
const ACTION_DESCRIPTIONS: Readonly<Record<ActionName, string>> = {
  submit: 'Author: send a complete draft to the press.',
  withdraw: 'Author: take a waiting submission back to draft.',
  claim: 'Editor: take a waiting submission into review.',
  accept: 'Claiming editor: accept with a release date.',
  decline: 'Claiming editor: decline with a note for the author.',
  revise: 'Author: turn a declined submission back into a draft.',
};
const WORKFLOW_ACTIONS = ACTIONS.map((a) => a.toUpperCase() as Uppercase<ActionName>);
const WorkflowAction = builder.enumType('WorkflowAction', {
  description: 'A status change the workflow allows. See `Submission.availableActions`.',
  values: describedValues<Uppercase<ActionName>>(
    WORKFLOW_ACTIONS,
    Object.fromEntries(
      ACTIONS.map((action) => [action.toUpperCase(), ACTION_DESCRIPTIONS[action]]),
    ) as Record<Uppercase<ActionName>, string>,
  ),
});
const StepSlug = builder.enumType('Step', {
  description: 'A step of the submission wizard; the value is the URL segment.',
  values: describedValues<StepName>(
    STEPS.map((step) => step.slug),
    Object.fromEntries(STEPS.map((step) => [step.slug, `Step ${step.number}: ${step.title}.`])) as Record<
      StepName,
      string
    >,
  ),
});

// ---------------------------------------------------------------- errors

const ErrorInterface = builder.interfaceRef<Error>('Error').implement({
  description: 'An expected failure. Every member of a result union except the success type implements it.',
  fields: (t) => ({
    message: t.exposeString('message', { description: 'A sentence for the person using the app.' }),
  }),
});

for (const [ErrorType, description] of [
  [NotSignedInError, 'The operation needs a signed-in user.'],
  [ForbiddenError, 'The viewer’s role cannot do this.'],
  [NotFoundError, 'The record does not exist, or the viewer may not see it (the two are not distinguished).'],
  [InvalidCredentialsError, 'The email and password do not match an account.'],
  [UploadRejectedError, 'The file is empty, larger than 5 MB, or neither a PDF nor UTF-8 text.'],
] as const) {
  builder.objectType(ErrorType, { name: ErrorType.name, description, interfaces: [ErrorInterface] });
}

const FieldProblem = builder.objectRef<{ field: string; message: string }>('FieldProblem').implement({
  description: 'One invalid input field.',
  fields: (t) => ({
    field: t.exposeString('field', { description: 'The input field’s name, as sent.' }),
    message: t.exposeString('message', { description: 'What is wrong with it.' }),
  }),
});

builder.objectType(ValidationError, {
  name: 'ValidationError',
  description: 'Input failed the shared validation rules.',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    problems: t.field({
      type: [FieldProblem],
      description: 'Each invalid field and why.',
      resolve: (e) => [...e.problems],
    }),
  }),
});

builder.objectType(ConflictError, {
  name: 'ConflictError',
  description: 'Optimistic concurrency: the submission changed since the version the client sent.',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    currentVersion: t.exposeInt('currentVersion', { description: 'The version now stored.' }),
  }),
});

builder.objectType(InvalidTransitionError, {
  name: 'InvalidTransitionError',
  description: 'The workflow does not allow this change from the current status, by this person.',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    status: t.exposeString('status', { description: 'The submission’s status when the change was refused.' }),
  }),
});

builder.objectType(LockedFieldError, {
  name: 'LockedFieldError',
  description: 'A save touched fields that are locked after acceptance.',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    fields: t.field({
      type: ['String'],
      description: 'The locked fields the save tried to change.',
      resolve: (e) => [...e.fields],
    }),
  }),
});

const ReadinessIssue = builder
  .objectRef<{ step: string; field: string; message: string }>('ReadinessIssue')
  .implement({
    description: 'One thing still missing before a draft can be submitted.',
    fields: (t) => ({
      step: t.field({
        type: StepSlug,
        description: 'The wizard step that holds the field.',
        resolve: (i) => i.step as 'basics',
      }),
      field: t.exposeString('field', { description: 'The field to fix; `file` is the manuscript upload.' }),
      message: t.exposeString('message', { description: 'What the author should do.' }),
    }),
  });

builder.objectType(IncompleteSubmissionError, {
  name: 'IncompleteSubmissionError',
  description: 'The draft cannot be submitted yet.',
  interfaces: [ErrorInterface],
  fields: (t) => ({
    issues: t.field({
      type: [ReadinessIssue],
      description: 'Everything still missing, in wizard order.',
      resolve: (e) => [...e.issues],
    }),
  }),
});

/** Errors any signed-in mutation on a submission can return. */
const SUBMISSION_ERRORS: ErrorClass[] = [
  NotSignedInError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InvalidTransitionError,
];

// ---------------------------------------------------------------- objects

const User = builder.objectRef<UserRecord>('User').implement({
  description: 'An account: an author or an editor.',
  fields: (t) => ({
    id: t.exposeID('id', { description: 'Stable identifier.' }),
    name: t.exposeString('name', { description: 'Display name.' }),
    email: t.string({
      nullable: true,
      description:
        'Sign-in email address. Shown only to the account itself, and to editors for authors; null otherwise.',
      resolve: (u, _args, ctx) =>
        ctx.viewer && (ctx.viewer.id === u.id || (ctx.viewer.role === 'EDITOR' && u.role === 'AUTHOR'))
          ? u.email
          : null,
    }),
    role: t.field({ type: Role, description: 'What the account may do.', resolve: (u) => u.role }),
  }),
});

const Manuscript = builder.objectRef<ManuscriptRecord>('Manuscript').implement({
  description: 'An uploaded manuscript file.',
  fields: (t) => ({
    id: t.exposeID('id', { description: 'Stable identifier.' }),
    fileName: t.exposeString('fileName', {
      description: 'The original name, cleaned for display. Never a path.',
    }),
    mediaType: t.exposeString('mediaType', {
      description: '`application/pdf` or `text/plain`, decided from the file’s content.',
    }),
    sizeBytes: t.exposeInt('sizeBytes', { description: 'Size in bytes (at most 5 MB).' }),
    downloadUrl: t.string({
      description: 'Same-origin path that serves the file to its author and to editors.',
      resolve: (m) => `/manuscripts/${m.id}`,
    }),
  }),
});

const Submission = builder.objectRef<SubmissionRecord>('Submission').implement({
  description: 'A piece of work moving through the workflow, from draft to decision.',
  fields: (t) => ({
    id: t.exposeID('id', { description: 'Stable identifier.' }),
    status: t.field({
      type: SubmissionStatus,
      description: 'Where it is in the workflow.',
      resolve: (s) => s.status,
    }),
    version: t.exposeInt('version', {
      description: 'Increases with every write. Send it back with saves and status changes.',
    }),
    title: t.exposeString('title', {
      nullable: true,
      description: 'The work’s title (up to 120 characters).',
    }),
    form: t.field({ type: Form, nullable: true, description: 'The kind of work.', resolve: (s) => s.form }),
    synopsis: t.exposeString('synopsis', {
      nullable: true,
      description: 'What it is about (50 to 2,000 characters).',
    }),
    wordCount: t.exposeInt('wordCount', { nullable: true, description: 'Length in words (500 to 120,000).' }),
    season: t.field({
      type: Season,
      nullable: true,
      description: 'The publishing list asked for.',
      resolve: (s) => s.season,
    }),
    timeSensitive: t.exposeBoolean('timeSensitive', {
      description: 'Whether the work is tied to a date (an anniversary, say).',
    }),
    scheduleNote: t.exposeString('scheduleNote', {
      description: 'Optional timing note (up to 400 characters).',
    }),
    penName: t.exposeString('penName', { description: 'Optional pen name (up to 80 characters).' }),
    bio: t.exposeString('bio', { nullable: true, description: 'Short biography (20 to 600 characters).' }),
    rightsConfirmed: t.exposeBoolean('rightsConfirmed', {
      description: 'The author confirmed they hold the rights to the work.',
    }),
    decisionNote: t.exposeString('decisionNote', {
      nullable: true,
      description: 'The editor’s note to the author, when declined.',
    }),
    releaseDate: t.field({
      type: 'Date',
      nullable: true,
      description: 'The planned release date, when accepted.',
      resolve: (s) => s.releaseDate,
    }),
    submittedAt: t.field({
      type: 'DateTime',
      nullable: true,
      description: 'When it was last submitted; null for drafts.',
      resolve: (s) => s.submittedAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      description: 'When it last changed.',
      resolve: (s) => s.updatedAt,
    }),
    manuscript: t.field({
      type: Manuscript,
      nullable: true,
      description: 'The uploaded manuscript, if any.',
      resolve: (s, _args, ctx) => (s.manuscriptId ? ctx.loaders.manuscript.load(s.manuscriptId) : null),
    }),
    author: t.field({
      type: User,
      description: 'Who wrote it.',
      resolve: async (s, _args, ctx) => {
        const author = await ctx.loaders.user.load(s.authorId);
        if (!author) throw new Error('Submission author missing');
        return author;
      },
    }),
    editor: t.field({
      type: User,
      nullable: true,
      description: 'The editor who claimed it, once in review.',
      resolve: (s, _args, ctx) => (s.editorId ? ctx.loaders.user.load(s.editorId) : null),
    }),
    readiness: t.field({
      type: [ReadinessIssue],
      description: 'What is still missing before this draft can be submitted.',
      resolve: (s) => readiness({ ...s, hasManuscript: s.manuscriptId !== null }),
    }),
    lockedFields: t.field({
      type: ['String'],
      description:
        'Fields that can no longer change. After acceptance, all but a few are locked; `file` is the manuscript.',
      resolve: (s) => (s.status === 'ACCEPTED' ? [...LOCKED_AFTER_ACCEPTANCE] : []),
    }),
    availableActions: t.field({
      type: [WorkflowAction],
      description:
        'The status changes the viewer’s role could make now. The server checks again on each change.',
      resolve: (s, _args, ctx) =>
        ctx.viewer
          ? availableActions(s.status, ctx.viewer.role).map((a) => a.toUpperCase() as Uppercase<typeof a>)
          : [],
    }),
  }),
});

const Notification = builder.objectRef<NotificationRecord>('Notification').implement({
  description: 'An in-app message to an author about a decision.',
  fields: (t) => ({
    id: t.exposeID('id', { description: 'Stable identifier.' }),
    subject: t.exposeString('subject', { description: 'One-line summary.' }),
    body: t.exposeString('body', { description: 'Plain text; paragraphs are separated by blank lines.' }),
    createdAt: t.field({ type: 'DateTime', description: 'When it was sent.', resolve: (n) => n.createdAt }),
    readAt: t.field({
      type: 'DateTime',
      nullable: true,
      description: 'When it was marked read; null while unread.',
      resolve: (n) => n.readAt,
    }),
    submissionId: t.exposeID('submissionId', { description: 'The submission it is about.' }),
  }),
});

const PageInfo = builder.objectRef<{ hasNextPage: boolean; endCursor: string | null }>('PageInfo').implement({
  description: 'Where a page of a keyset-paginated list ends.',
  fields: (t) => ({
    hasNextPage: t.exposeBoolean('hasNextPage', { description: 'Whether older records follow.' }),
    endCursor: t.exposeString('endCursor', {
      nullable: true,
      description: 'Pass as `after` to read the next page; null for an empty page.',
    }),
  }),
});

const QueuePage = builder.objectRef<submissionService.QueuePage>('QueuePage').implement({
  description: 'One page of the editors’ queue, newest submission first.',
  fields: (t) => ({
    nodes: t.field({
      type: [Submission],
      description: 'The submissions on this page.',
      resolve: (p) => p.nodes,
    }),
    pageInfo: t.field({ type: PageInfo, description: 'How to continue.', resolve: (p) => p }),
  }),
});

const Press = builder.objectRef<{ name: string; timeZone: string }>('Press').implement({
  description: 'The publisher running this instance.',
  fields: (t) => ({
    name: t.exposeString('name', { description: 'The press’s name.' }),
    timeZone: t.exposeString('timeZone', { description: 'The IANA time zone release dates are judged in.' }),
    today: t.field({
      type: 'Date',
      description: "Today's date in the press's time zone.",
      resolve: (p, _args, ctx) => todayIn(p.timeZone, ctx.services.now()),
    }),
  }),
});

// ---------------------------------------------------------------- inputs

const DraftInput = builder.inputType('DraftInput', {
  description: 'Any subset of draft fields. Omitted fields are left unchanged.',
  fields: (t) => ({
    title: t.string({ description: 'The work’s title (1 to 120 characters).' }),
    form: t.field({ type: Form, description: 'The kind of work.' }),
    synopsis: t.string({ description: 'What it is about (50 to 2,000 characters).' }),
    wordCount: t.int({ description: 'Length in words (500 to 120,000).' }),
    season: t.field({ type: Season, description: 'The publishing list asked for.' }),
    timeSensitive: t.boolean({ description: 'Whether the work is tied to a date.' }),
    scheduleNote: t.string({ description: 'Optional timing note (up to 400 characters).' }),
    penName: t.string({ description: 'Optional pen name (up to 80 characters).' }),
    bio: t.string({ description: 'Short biography (20 to 600 characters).' }),
    rightsConfirmed: t.boolean({ description: 'The author holds the rights to the work.' }),
  }),
});

/** GraphQL input objects carry explicit nulls; a patch only keeps the fields that were sent with a value. */
function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined),
  );
}

// ---------------------------------------------------------------- query

builder.queryType({
  description: 'Reads. Anonymous callers get nulls or empty lists rather than errors, except where noted.',
  fields: (t) => ({
    me: t.field({
      type: User,
      nullable: true,
      description: 'The signed-in user, or null.',
      resolve: async (_root, _args, ctx) => {
        if (!ctx.viewer) return null;
        return ctx.loaders.user.load(ctx.viewer.id);
      },
    }),
    press: t.field({
      type: Press,
      description: 'The press’s name, time zone and today’s date there. Public.',
      resolve: (_root, _args, ctx) => ({
        name: ctx.services.pressName,
        timeZone: ctx.services.pressTimeZone,
      }),
    }),
    mySubmissions: t.field({
      type: [Submission],
      description: 'The viewer’s own submissions, most recently changed first.',
      resolve: (_root, _args, ctx) =>
        ctx.viewer ? submissionService.listOwn(ctx.services.db, ctx.viewer) : [],
    }),
    submission: t.field({
      type: Submission,
      nullable: true,
      description: 'One submission the viewer may see (their own; editors also see non-drafts), or null.',
      args: { id: t.arg.id({ required: true, description: 'The submission’s id.' }) },
      resolve: async (_root, args, ctx) => {
        try {
          return await submissionService.getSubmission(ctx.services.db, ctx.viewer, args.id);
        } catch (error) {
          if (error instanceof NotFoundError || error instanceof NotSignedInError) return null;
          throw error;
        }
      },
    }),
    reviewQueue: t.field({
      type: QueuePage,
      description: 'Editors only: submitted work, newest first, with keyset pagination.',
      errors: resultOf('reviewQueue', 'The requested page.', [
        NotSignedInError,
        ForbiddenError,
        ValidationError,
      ]),
      args: {
        statuses: t.arg({
          type: [SubmissionStatus],
          description: 'Only these statuses; omitted or empty means every status except DRAFT.',
        }),
        first: t.arg.int({ defaultValue: 10, description: 'Page size, clamped to 1–50.' }),
        after: t.arg.string({ description: 'The `endCursor` of the previous page.' }),
      },
      resolve: (_root, args, ctx) =>
        submissionService.reviewQueue(ctx.services.db, ctx.viewer, {
          statuses: args.statuses ?? [],
          first: args.first ?? 10,
          after: args.after ?? null,
        }),
    }),
    notifications: t.field({
      type: [Notification],
      description: 'The viewer’s 50 most recent messages, newest first.',
      resolve: (_root, _args, ctx) =>
        ctx.viewer ? submissionService.listNotifications(ctx.services.db, ctx.viewer) : [],
    }),
  }),
});

// ---------------------------------------------------------------- mutations

const ID_ARG = 'The submission’s id.';
const VERSION_ARG = 'The version the client last saw; a mismatch returns ConflictError.';

builder.mutationType({
  description:
    'Writes. Every request needs the x-submission-wizard-csrf header; expected failures come back in result unions.',
  fields: (t) => ({
    signIn: t.field({
      type: User,
      description:
        'Signs in and sets the HTTP-only session cookie. Rate-limited per client, per client and email, and per email.',
      errors: resultOf('signIn', 'The signed-in user.', [InvalidCredentialsError, ValidationError]),
      args: {
        email: t.arg.string({
          required: true,
          description: 'Account email; case and surrounding spaces are ignored.',
        }),
        password: t.arg.string({ required: true, description: 'Account password.' }),
      },
      resolve: async (_root, { email, password }, ctx) => {
        const { user, token } = await auth.signIn(
          ctx.services,
          { email, password, clientAddress: ctx.clientAddress },
          ctx.sessionSecret,
        );
        ctx.setCookie(sessionCookie(token, SESSION_TTL_SECONDS, ctx.secureCookies));
        return user;
      },
    }),
    markNotificationsRead: t.int({
      description: 'Marks all of the viewer’s notifications as read and returns how many changed.',
      errors: resultOf('markNotificationsRead', 'How many notifications changed.', [NotSignedInError]),
      resolve: (_root, _args, ctx) =>
        submissionService.markNotificationsRead(ctx.services.db, ctx.viewer, ctx.services.now()),
    }),
    signOut: t.boolean({
      description: 'Ends every session of the viewer, on every device, and clears the cookie.',
      resolve: async (_root, _args, ctx) => {
        await auth.signOut(ctx.services, ctx.viewer);
        ctx.setCookie(sessionCookie('', 0, ctx.secureCookies));
        return true;
      },
    }),
    createDraft: t.field({
      type: Submission,
      description: 'Authors: starts a new draft from any subset of fields.',
      errors: resultOf('createDraft', 'The new draft (version 1).', SUBMISSION_ERRORS),
      args: { input: t.arg({ type: DraftInput, required: true, description: 'The fields to set.' }) },
      resolve: (_root, { input }, ctx) =>
        submissionService.createDraft(ctx.services, ctx.viewer, compact(input)),
    }),
    saveDraft: t.field({
      type: Submission,
      description: 'Authors: saves fields of a draft, or the editable fields of an accepted submission.',
      errors: resultOf('saveDraft', 'The saved submission with its new version.', [
        ...SUBMISSION_ERRORS,
        LockedFieldError,
      ]),
      args: {
        id: t.arg.id({ required: true, description: ID_ARG }),
        version: t.arg.int({ required: true, description: VERSION_ARG }),
        input: t.arg({ type: DraftInput, required: true, description: 'The fields to change.' }),
      },
      resolve: (_root, { id, version, input }, ctx) =>
        submissionService.saveDraft(ctx.services, ctx.viewer, id, version, compact(input)),
    }),
    uploadManuscript: t.field({
      type: Submission,
      description:
        'Authors: attaches a PDF or UTF-8 text manuscript (up to 5 MB) to a draft, replacing any earlier one.',
      errors: resultOf('uploadManuscript', 'The draft with its new manuscript and version.', [
        ...SUBMISSION_ERRORS,
        UploadRejectedError,
      ]),
      args: {
        id: t.arg.id({ required: true, description: ID_ARG }),
        version: t.arg.int({ required: true, description: VERSION_ARG }),
        file: t.arg({
          type: 'File',
          required: true,
          description: 'The manuscript, sent as a multipart file.',
        }),
      },
      resolve: async (_root, { id, version, file }, ctx) => {
        // Refuse before reading the bytes; the request body limit has already capped the total.
        if (file.size > MAX_UPLOAD_BYTES) throw new UploadRejectedError('Manuscripts can be up to 5 MB.');
        return submissionService.attachManuscript(ctx.services, ctx.viewer, id, version, {
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
      },
    }),
    acceptSubmission: t.field({
      type: Submission,
      description: 'The claiming editor: accepts with a release date and messages the author.',
      errors: resultOf('acceptSubmission', 'The accepted submission.', SUBMISSION_ERRORS),
      args: {
        id: t.arg.id({ required: true, description: ID_ARG }),
        releaseDate: t.arg({
          type: 'Date',
          required: true,
          description: 'Release date in the press’s time zone, 30 days to two years from today.',
        }),
      },
      resolve: (_root, { id, releaseDate }, ctx) =>
        submissionService.transition(ctx.services, ctx.viewer, id, 'accept', { releaseDate }),
    }),
    declineSubmission: t.field({
      type: Submission,
      description: 'The claiming editor: declines with a note, which the author receives.',
      errors: resultOf('declineSubmission', 'The declined submission.', SUBMISSION_ERRORS),
      args: {
        id: t.arg.id({ required: true, description: ID_ARG }),
        note: t.arg.string({
          required: true,
          description: 'A note for the author (10 to 2,000 characters after trimming).',
        }),
      },
      resolve: (_root, { id, note }, ctx) =>
        submissionService.transition(ctx.services, ctx.viewer, id, 'decline', { note }),
    }),
    duplicateSubmission: t.field({
      type: Submission,
      description: 'Authors: starts a new draft from one of their submissions (text fields only, no file).',
      errors: resultOf('duplicateSubmission', 'The new draft.', SUBMISSION_ERRORS),
      args: { id: t.arg.id({ required: true, description: 'The submission to copy.' }) },
      resolve: (_root, { id }, ctx) => submissionService.duplicateSubmission(ctx.services, ctx.viewer, id),
    }),
  }),
});

const WORKFLOW_FIELD_DESCRIPTIONS = {
  submit:
    'Authors: sends a complete draft to the press. Refused with IncompleteSubmissionError while anything is missing.',
  withdraw: 'Authors: takes a submission that no editor has claimed back to draft.',
  claim: 'Editors: takes a waiting submission into review; of two editors claiming at once, one wins.',
  revise: 'Authors: turns a declined submission back into a draft, keeping its text.',
} as const;

function workflowField(
  action: 'submit' | 'withdraw' | 'claim' | 'revise',
  options: { needsVersion?: boolean } = {},
) {
  const name = `${action}Submission`;
  builder.mutationField(name, (t) =>
    t.field({
      type: Submission,
      description: WORKFLOW_FIELD_DESCRIPTIONS[action],
      errors: resultOf(
        name,
        'The submission in its new status.',
        action === 'submit' ? [...SUBMISSION_ERRORS, IncompleteSubmissionError] : SUBMISSION_ERRORS,
      ),
      args: {
        id: t.arg.id({ required: true, description: ID_ARG }),
        version: t.arg.int({
          required: options.needsVersion === true,
          description: options.needsVersion === true ? VERSION_ARG : `Optional. ${VERSION_ARG}`,
        }),
      },
      resolve: (_root, { id, version }, ctx) =>
        submissionService.transition(
          ctx.services,
          ctx.viewer,
          id,
          action,
          version == null ? {} : { version },
        ),
    }),
  );
}

workflowField('submit', { needsVersion: true });
workflowField('withdraw', { needsVersion: true });
workflowField('claim');
workflowField('revise');

function sessionCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * The executable schema, with types and fields sorted so the dumped SDL diffs cleanly.
 *
 * @see server/schema.graphql
 * @see docs/reference/api.md
 */
export const schema = builder.toSchema({ sortSchema: true });
