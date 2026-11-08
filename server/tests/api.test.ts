import { desc } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createDb, createPool } from '../src/db/client';
import { manuscripts, submissions } from '../src/db/schema';
import { FileStorage } from '../src/domain/storage';
import { createApp, CSRF_HEADER } from '../src/http/app';
import { useHarness } from './harness';

const h = useHarness();

const SUBMISSION =
  'id status version title rightsConfirmed readiness { step field } lockedFields availableActions';

const CREATE = `mutation($input: DraftInput!) { createDraft(input: $input) {
  __typename ... on MutationCreateDraftSuccess { data { ${SUBMISSION} } }
  ... on ValidationError { problems { field message } } } }`;
const SAVE = `mutation($id: ID!, $version: Int!, $input: DraftInput!) { saveDraft(id: $id, version: $version, input: $input) {
  __typename ... on MutationSaveDraftSuccess { data { ${SUBMISSION} bio } }
  ... on ConflictError { currentVersion } ... on LockedFieldError { fields } ... on Error { message } } }`;
const UPLOAD = `mutation($id: ID!, $version: Int!, $file: File!) { uploadManuscript(id: $id, version: $version, file: $file) {
  __typename ... on MutationUploadManuscriptSuccess { data { version manuscript { fileName mediaType sizeBytes downloadUrl } } }
  ... on Error { message } } }`;
const SUBMIT = `mutation($id: ID!, $version: Int!) { submitSubmission(id: $id, version: $version) {
  __typename ... on MutationSubmitSubmissionSuccess { data { status version } }
  ... on IncompleteSubmissionError { issues { step field } } ... on Error { message } } }`;
const CLAIM = `mutation($id: ID!) { claimSubmission(id: $id) { __typename ... on MutationClaimSubmissionSuccess { data { status editor { name } } } ... on Error { message } } }`;
const ACCEPT = `mutation($id: ID!, $date: Date!) { acceptSubmission(id: $id, releaseDate: $date) {
  __typename ... on MutationAcceptSubmissionSuccess { data { status version releaseDate lockedFields } }
  ... on ValidationError { problems { field message } } ... on Error { message } } }`;
const DECLINE = `mutation($id: ID!, $note: String!) { declineSubmission(id: $id, note: $note) {
  __typename ... on MutationDeclineSubmissionSuccess { data { status decisionNote } } ... on Error { message } } }`;
const REVISE = `mutation($id: ID!) { reviseSubmission(id: $id) { __typename ... on MutationReviseSubmissionSuccess { data { status rightsConfirmed } } ... on Error { message } } }`;

const COMPLETE_DRAFT = {
  title: 'Salt Ledger',
  form: 'CHAPBOOK',
  synopsis: 'Twenty-four short poems kept like entries in a harbour ledger, one for every tide.',
  wordCount: 6000,
  season: 'SPRING',
  bio: 'Writes about coastlines and the people who keep them.',
  rightsConfirmed: true,
};

const pdf = (name = 'ledger.pdf', body = '%PDF-1.4\nsample') =>
  new File([body], name, { type: 'application/pdf' });

async function authorWithCompleteSubmission() {
  const author = await h.createUser('Wren Calloway', 'AUTHOR');
  const cookie = await h.signIn(author);
  const created = (await h.gql(CREATE, { input: COMPLETE_DRAFT }, cookie)).createDraft.data;
  const uploaded = await h.upload(UPLOAD, { id: created.id, version: created.version }, pdf(), cookie);
  return {
    author,
    cookie,
    id: created.id as string,
    version: uploaded.data?.uploadManuscript.data.version as number,
  };
}

async function submitted() {
  const ctx = await authorWithCompleteSubmission();
  const result = (await h.gql(SUBMIT, { id: ctx.id, version: ctx.version }, ctx.cookie)).submitSubmission;
  const editor = await h.createUser('Hollis Beaumont', 'EDITOR');
  return { ...ctx, version: result.data.version as number, editor, editorCookie: await h.signIn(editor) };
}

/** The headers every API response carries (see SECURITY_HEADERS in src/http/app.ts). */
const API_HEADERS = {
  'content-security-policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

function headersOf(response: Response, names: readonly string[]): Record<string, string | null> {
  return Object.fromEntries(names.map((name) => [name, response.headers.get(name)]));
}

const SIGN_IN = (email: string, password = 'nope') =>
  JSON.stringify({
    query: `mutation { signIn(email: "${email}", password: "${password}") { __typename } }`,
  });

describe('transport and sessions', () => {
  it('refuses POSTs without the CSRF header or from foreign origins', async () => {
    const body = JSON.stringify({ query: '{ me { id } }' });
    const noHeader = await h.app.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    expect(noHeader.status).toBe(400);
    const foreign = await h.request(body, {
      'content-type': 'application/json',
      origin: 'https://attacker.example',
    });
    expect(foreign.status).toBe(403);
    expect((await h.app.fetch('http://localhost/healthz')).status).toBe(200);
  });

  it('serves GraphQL over POST only, and lets only the app’s own origin read responses', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const overGet = await h.app.fetch(
      `http://localhost/graphql?query=${encodeURIComponent('{ me { id } }')}`,
      {
        headers: { cookie, [CSRF_HEADER]: '1' },
      },
    );
    expect(overGet.status).toBe(405);
    expect(overGet.headers.get('allow')).toBe('POST');

    const preflight = (origin: string) =>
      h.app.fetch('http://localhost/graphql', {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type, x-submission-wizard-csrf',
        },
      });
    const own = await preflight('http://localhost:5180');
    expect(own.headers.get('access-control-allow-origin')).toBe('http://localhost:5180');
    expect(own.headers.get('access-control-allow-credentials')).toBe('true');
    expect(own.headers.get('access-control-allow-headers')).toBe('content-type, x-submission-wizard-csrf');
    // Browsers compare this header with their own origin, so a foreign page is refused.
    const foreign = await preflight('http://localhost:6000');
    expect(foreign.headers.get('access-control-allow-origin')).toBe('http://localhost:5180');
    const foreignPost = await h.request(JSON.stringify({ query: '{ me { id } }' }), {
      'content-type': 'application/json',
      origin: 'http://localhost:6000',
      cookie,
    });
    expect(foreignPost.status).toBe(403);
    const foreignDownload = await h.app.fetch(
      'http://localhost/manuscripts/00000000-0000-4000-8000-000000000000',
      {
        headers: { origin: 'http://localhost:6000', cookie },
      },
    );
    expect(foreignDownload.status).toBe(403);

    const reply = await h.gql('{ me { name } }', {}, cookie);
    expect(reply.me.name).toBe('Wren Calloway');
  });

  it('sends security headers on every response, refusals and health checks included', async () => {
    const body = JSON.stringify({ query: '{ me { id } }' });
    const responses = [
      await h.request(body, { 'content-type': 'application/json' }),
      await h.request(body, { 'content-type': 'application/json', origin: 'https://attacker.example' }),
      await h.app.fetch('http://localhost/graphql', { method: 'POST', body }),
      await h.app.fetch('http://localhost/graphql?query=%7Bme%7Bid%7D%7D'),
      await h.app.fetch('http://localhost/healthz'),
      await h.app.fetch('http://localhost/manuscripts/00000000-0000-4000-8000-000000000000'),
    ];
    expect(responses.map((r) => r.status)).toEqual([200, 403, 400, 405, 200, 404]);
    for (const response of responses) {
      expect(headersOf(response, Object.keys(API_HEADERS))).toEqual(API_HEADERS);
    }
  });

  it('refuses an oversized body before buffering it', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    const form = new FormData();
    form.set('operations', JSON.stringify({ query: UPLOAD, variables: { id, version: 1, file: null } }));
    form.set('map', JSON.stringify({ 0: ['variables.file'] }));
    form.set('0', new File([new Uint8Array(6 * 1024 * 1024).fill(65)], 'huge.txt'));
    const encoded = new Response(form);
    const bytes = await encoded.arrayBuffer();
    const contentType = encoded.headers.get('content-type') ?? '';
    // A declared length over the limit is refused before any of the body is read.
    const declared = await h.request(
      bytes,
      { 'content-type': contentType, 'content-length': String(bytes.byteLength) },
      cookie,
    );
    expect(declared.status).toBe(413);
    // A streamed body with no length is cut off once it passes the limit.
    const streamed = await h.request(form, {}, cookie);
    expect(streamed.status).toBe(400);
    expect(await streamed.text()).toMatch(/Request body too large/);
    expect(await h.db.select().from(manuscripts)).toEqual([]);
  });

  it('reports unhealthy when the database does not answer', async () => {
    const pool = createPool('submission_wizard_database_that_does_not_exist');
    const app = createApp({ ...h.appOptions, services: { ...h.appOptions.services, db: createDb(pool) } });
    expect((await app.fetch('http://localhost/healthz')).status).toBe(503);
    await pool.end();
  });

  it('masks unexpected errors: the client gets a generic message and the detail is only logged', async () => {
    const broken = createApp({
      ...h.appOptions,
      services: { ...h.appOptions.services, pressTimeZone: 'Mars/Olympus_Mons' },
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const response = await h.request(
        JSON.stringify({ query: '{ press { name today } }' }),
        { 'content-type': 'application/json' },
        undefined,
        broken,
      );
      const text = await response.text();
      expect(JSON.parse(text).errors).toEqual([expect.objectContaining({ message: 'Unexpected error.' })]);
      expect(text).not.toMatch(/Mars|RangeError|stack/i);
      expect(stderr.mock.calls.map(([line]) => String(line)).join('')).toMatch(/Mars\/Olympus_Mons/);
    } finally {
      stderr.mockRestore();
    }
  });

  it('turns off introspection in production', async () => {
    const app = createApp({ ...h.appOptions, production: true });
    const response = await app.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CSRF_HEADER]: '1' },
      body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
    });
    const payload = (await response.json()) as { errors?: { message: string }[] };
    expect(payload.errors?.[0]?.message).toMatch(/introspection/i);
    expect((await h.gql('{ __schema { queryType { name } } }')).__schema.queryType.name).toBe('Query');
  });

  it('signs in with an HTTP-only cookie, and rejects wrong passwords with a typed error', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    expect((await h.gql('{ me { name role } }', {}, cookie)).me).toEqual({
      name: 'Wren Calloway',
      role: 'AUTHOR',
    });

    const wrong = await h.gql(
      'mutation { signIn(email: "wren.calloway@example.com", password: "nope") { __typename ... on Error { message } } }',
    );
    expect(wrong.signIn.__typename).toBe('InvalidCredentialsError');
    expect((await h.gql('{ me { id } }')).me).toBeNull();
  });

  it('sets a signed, HTTP-only, SameSite cookie and clears it on sign-out', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const response = await h.request(
      JSON.stringify({
        query: `mutation { signIn(email: "${author.email}", password: "correct horse battery") { __typename } }`,
      }),
      { 'content-type': 'application/json' },
    );
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly; SameSite=Lax; Max-Age=43200$/);
    const out = await h.request(JSON.stringify({ query: 'mutation { signOut }' }), {
      'content-type': 'application/json',
    });
    expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0/);

    const secure = createApp({ ...h.appOptions, secureCookies: true });
    const overHttps = await secure.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CSRF_HEADER]: '1' },
      body: SIGN_IN(author.email, 'correct horse battery'),
    });
    expect(overHttps.headers.get('set-cookie')).toMatch(/; Secure$/);
  });

  it('signing out revokes the session token itself, not just the cookie', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const stolen = await h.signIn(author);
    const start = h.state.clock().getTime();
    h.state.clock = () => new Date(start + 1000);
    await h.gql('mutation { signOut }', {}, stolen);
    expect((await h.gql('{ me { id } }', {}, stolen)).me).toBeNull();
    const fresh = await h.signIn(author);
    expect((await h.gql('{ me { name } }', {}, fresh)).me.name).toBe('Wren Calloway');
  });

  it('limits repeated sign-in attempts', async () => {
    await h.createUser('Wren Calloway', 'AUTHOR');
    const attempt = () =>
      h.gql('mutation { signIn(email: "wren.calloway@example.com", password: "nope") { __typename } }');
    for (let i = 0; i < 10; i += 1)
      expect((await attempt()).signIn.__typename).toBe('InvalidCredentialsError');
    expect((await attempt()).signIn.__typename).toBe('ValidationError');
  });

  it('keys the limit on the connection, not on a forwarded-for header the client chose', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const attempt = async (app: typeof h.app, headers: Record<string, string>, address: string) => {
      const response = await app.fetch(
        'http://localhost/graphql',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', [CSRF_HEADER]: '1', ...headers },
          body: SIGN_IN(author.email),
        },
        { req: { socket: { remoteAddress: address } } },
      );
      const payload: any = await response.json();
      return payload.data.signIn.__typename as string;
    };
    for (let i = 0; i < 10; i += 1) await attempt(h.app, { 'x-forwarded-for': `10.0.0.${i}` }, '192.0.2.1');
    expect(await attempt(h.app, { 'x-forwarded-for': '10.0.0.99' }, '192.0.2.1')).toBe('ValidationError');
    // Another connection has its own budget, so one client cannot lock an email out for everyone.
    expect(await attempt(h.app, {}, '192.0.2.2')).toBe('InvalidCredentialsError');

    const behindProxy = createApp({ ...h.appOptions, trustProxy: 1 });
    expect(await attempt(behindProxy, { 'x-forwarded-for': '198.51.100.7' }, '192.0.2.1')).toBe(
      'InvalidCredentialsError',
    );
  });

  it('behind a trusted proxy, keys the limit on the entry the proxy added, not one the client wrote', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const attempt = async (app: typeof h.app, forwardedFor: string) => {
      const response = await app.fetch(
        'http://localhost/graphql',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [CSRF_HEADER]: '1',
            'x-forwarded-for': forwardedFor,
          },
          body: SIGN_IN(author.email),
        },
        { req: { socket: { remoteAddress: '10.0.0.1' } } },
      );
      const payload: any = await response.json();
      return payload.data.signIn.__typename as string;
    };
    const oneProxy = createApp({ ...h.appOptions, trustProxy: 1 });
    // The client rotates a forged first entry; the proxy appends the real address last.
    for (let i = 0; i < 10; i += 1) await attempt(oneProxy, `spoofed-${i}, 203.0.113.5`);
    expect(await attempt(oneProxy, 'spoofed-99, 203.0.113.5')).toBe('ValidationError');
    expect(await attempt(oneProxy, 'spoofed-0, 203.0.113.6')).toBe('InvalidCredentialsError');
    // With two proxies, the second entry from the right is the client.
    const twoProxies = createApp({ ...h.appOptions, trustProxy: 2 });
    expect(await attempt(twoProxies, 'spoofed, 203.0.113.5, 10.0.0.2')).toBe('ValidationError');
  });

  it('caps attempts on one account however many addresses they come from', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const attempt = async (address: string) => {
      const response = await h.app.fetch(
        'http://localhost/graphql',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', [CSRF_HEADER]: '1' },
          body: SIGN_IN(author.email),
        },
        { req: { socket: { remoteAddress: address } } },
      );
      const payload: any = await response.json();
      return payload.data.signIn.__typename as string;
    };
    for (let client = 0; client < 10; client += 1) {
      for (let i = 0; i < 10; i += 1) await attempt(`198.51.100.${client}`);
    }
    expect(await attempt('198.51.100.200')).toBe('ValidationError');
    // Other accounts are not affected.
    const other = await h.createUser('Teodor Lindqvist', 'AUTHOR');
    expect(
      (await h.gql(`mutation { signIn(email: "${other.email}", password: "nope") { __typename } }`)).signIn
        .__typename,
    ).toBe('InvalidCredentialsError');
  }, 30_000);

  it('shows an email address only to its owner, and authors’ addresses to editors', async () => {
    const ctx = await submitted();
    await h.gql(CLAIM, { id: ctx.id }, ctx.editorCookie);
    const people = `{ me { email } submission(id: "${ctx.id}") { author { email } editor { email } } }`;
    expect(await h.gql(people, {}, ctx.cookie)).toEqual({
      me: { email: 'wren.calloway@example.com' },
      submission: { author: { email: 'wren.calloway@example.com' }, editor: { email: null } },
    });
    expect(await h.gql(people, {}, ctx.editorCookie)).toEqual({
      me: { email: 'hollis.beaumont@example.com' },
      submission: {
        author: { email: 'wren.calloway@example.com' },
        editor: { email: 'hollis.beaumont@example.com' },
      },
    });
    const otherEditor = await h.signIn(await h.createUser('June Haldane', 'EDITOR'));
    expect((await h.gql(people, {}, otherEditor)).submission.editor).toEqual({ email: null });
  });
});

describe('drafts', () => {
  it('creates a draft and saves changes, bumping the version each time', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const created = (await h.gql(CREATE, { input: { title: 'Salt Ledger' } }, cookie)).createDraft;
    expect(created.data).toMatchObject({ status: 'DRAFT', version: 1, title: 'Salt Ledger' });
    expect(created.data.readiness.map((i: { step: string }) => i.step)).toContain('manuscript');

    const saved = (
      await h.gql(SAVE, { id: created.data.id, version: 1, input: { form: 'ESSAY', title: null } }, cookie)
    ).saveDraft;
    expect(saved.data).toMatchObject({ version: 2, title: 'Salt Ledger' });
  });

  it('refuses a stale version with the current one, so the client can reload', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    await h.gql(SAVE, { id, version: 1, input: { title: 'From tab one' } }, cookie);
    const stale = (await h.gql(SAVE, { id, version: 1, input: { title: 'From tab two' } }, cookie)).saveDraft;
    expect(stale).toMatchObject({ __typename: 'ConflictError', currentVersion: 2 });
  });

  it('validates input with the shared schemas', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const result = (await h.gql(CREATE, { input: { title: 'x'.repeat(121), wordCount: -3 } }, cookie))
      .createDraft;
    expect(result.__typename).toBe('ValidationError');
    expect(result.problems.map((p: { field: string }) => p.field).sort()).toEqual(['title', 'wordCount']);
  });

  it('only lets authors write drafts, and only their own', async () => {
    const owner = await h.createUser('Wren Calloway', 'AUTHOR');
    const other = await h.createUser('Teodor Lindqvist', 'AUTHOR');
    const editor = await h.createUser('Hollis Beaumont', 'EDITOR');
    const { id } = (await h.gql(CREATE, { input: { title: 'Mine' } }, await h.signIn(owner))).createDraft
      .data;

    const otherCookie = await h.signIn(other);
    expect((await h.gql(`{ submission(id: "${id}") { id } }`, {}, otherCookie)).submission).toBeNull();
    expect(
      (await h.gql(SAVE, { id, version: 1, input: { title: 'Theirs' } }, otherCookie)).saveDraft.__typename,
    ).toBe('NotFoundError');
    const editorCookie = await h.signIn(editor);
    expect((await h.gql(`{ submission(id: "${id}") { id } }`, {}, editorCookie)).submission).toBeNull();
    expect((await h.gql(CREATE, { input: {} }, editorCookie)).createDraft.__typename).toBe('ForbiddenError');
    expect((await h.gql(CREATE, { input: {} })).createDraft.__typename).toBe('NotSignedInError');
  });

  it('copies text fields, not the file or the status, when starting from an earlier submission', async () => {
    const ctx = await submitted();
    const copy = (
      await h.gql(
        `mutation { duplicateSubmission(id: "${ctx.id}") { ... on MutationDuplicateSubmissionSuccess { data { id status title rightsConfirmed manuscript { id } } } } }`,
        {},
        ctx.cookie,
      )
    ).duplicateSubmission.data;
    expect(copy).toMatchObject({
      status: 'DRAFT',
      title: 'Salt Ledger',
      rightsConfirmed: false,
      manuscript: null,
    });
    expect(copy.id).not.toBe(ctx.id);
  });
});

describe('uploads', () => {
  it('stores a PDF under a random key and serves it only to people who may see it', async () => {
    const ctx = await authorWithCompleteSubmission();
    const view = (
      await h.gql(
        `{ submission(id: "${ctx.id}") { manuscript { downloadUrl mediaType fileName } } }`,
        {},
        ctx.cookie,
      )
    ).submission;
    expect(view.manuscript).toMatchObject({ mediaType: 'application/pdf', fileName: 'ledger.pdf' });

    const own = await h.app.fetch(`http://localhost${view.manuscript.downloadUrl}`, {
      headers: { cookie: ctx.cookie },
    });
    expect(own.status).toBe(200);
    expect(own.headers.get('content-type')).toBe('application/pdf');
    expect(own.headers.get('x-content-type-options')).toBe('nosniff');
    // A stricter policy than the API default: the file is sandboxed even if opened in a tab.
    expect(own.headers.get('content-security-policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
    expect(own.headers.get('x-frame-options')).toBe('DENY');
    expect(own.headers.get('cache-control')).toBe('private, no-store');
    expect(await own.text()).toBe('%PDF-1.4\nsample');

    const stranger = await h.signIn(await h.createUser('Teodor Lindqvist', 'AUTHOR'));
    expect(
      (await h.app.fetch(`http://localhost${view.manuscript.downloadUrl}`, { headers: { cookie: stranger } }))
        .status,
    ).toBe(404);
    expect((await h.app.fetch(`http://localhost${view.manuscript.downloadUrl}`)).status).toBe(404);
  });

  it('answers a malformed download id with 404, not a server error', async () => {
    const ctx = await authorWithCompleteSubmission();
    for (const id of ['-'.repeat(36), 'not-a-uuid', `${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(13)}`]) {
      const response = await h.app.fetch(`http://localhost/manuscripts/${id}`, {
        headers: { cookie: ctx.cookie },
      });
      expect(response.status, id).toBe(404);
    }
  });

  it('judges files by their bytes and size, and cleans the name', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;

    const disguised = await h.upload(
      UPLOAD,
      { id, version: 1 },
      new File([new Uint8Array([0x4d, 0x5a, 0, 1])], 'novel.pdf'),
      cookie,
    );
    expect(disguised.data?.uploadManuscript.message).toMatch(/PDF or a plain-text/);
    const huge = await h.upload(
      UPLOAD,
      { id, version: 1 },
      new File([new Uint8Array(5 * 1024 * 1024 + 1).fill(65)], 'big.txt'),
      cookie,
    );
    expect(huge.data?.uploadManuscript.message).toMatch(/up to 5 MB/);

    const text = await h.upload(
      UPLOAD,
      { id, version: 1 },
      new File(['Plain words.'], '../../secret <draft>.txt'),
      cookie,
    );
    expect(text.data?.uploadManuscript.data.manuscript).toMatchObject({
      mediaType: 'text/plain',
      fileName: 'secret draft.txt',
      sizeBytes: 12,
    });
    const download = await h.app.fetch(
      `http://localhost${text.data?.uploadManuscript.data.manuscript.downloadUrl}`,
      { headers: { cookie } },
    );
    expect(download.headers.get('content-type')).toBe('text/plain; charset=utf-8');

    // Valid text for the first 4 KB, then binary: the whole file is checked.
    const padded = new Uint8Array(8192).fill(65);
    padded.set([0x00, 0xff, 0xfe], 6000);
    const hidden = await h.upload(
      UPLOAD,
      { id, version: text.data?.uploadManuscript.data.version },
      new File([padded], 'notes.txt'),
      cookie,
    );
    expect(hidden.data?.uploadManuscript.message).toMatch(/PDF or a plain-text/);
  });

  it('names downloads safely for every browser, keeping the real name in filename*', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    const uploaded = await h.upload(
      UPLOAD,
      { id, version: 1 },
      new File(['Words.'], 'Café notes.txt'),
      cookie,
    );
    const download = await h.app.fetch(
      `http://localhost${uploaded.data?.uploadManuscript.data.manuscript.downloadUrl}`,
      { headers: { cookie } },
    );
    expect(download.headers.get('content-disposition')).toBe(
      `attachment; filename="Caf_ notes.txt"; filename*=UTF-8''Caf%C3%A9%20notes.txt`,
    );
    expect(download.headers.get('cache-control')).toBe('private, no-store');
  });

  it('removes the replaced manuscript, its record and its file', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    const first = await h.upload(UPLOAD, { id, version: 1 }, pdf('first.pdf'), cookie);
    const [old] = await h.db.select().from(manuscripts);
    const second = await h.upload(
      UPLOAD,
      { id, version: first.data?.uploadManuscript.data.version },
      pdf('second.pdf'),
      cookie,
    );
    expect(second.data?.uploadManuscript.data.manuscript.fileName).toBe('second.pdf');
    const remaining = await h.db.select().from(manuscripts);
    expect(remaining.map((m) => m.fileName)).toEqual(['second.pdf']);
    await expect(h.storage.read(old!.storageKey)).rejects.toThrow(/ENOENT/);
    expect((await h.storage.read(remaining[0]!.storageKey)).toString()).toBe('%PDF-1.4\nsample');
  });

  it('still reports a committed replacement as saved when the old file cannot be deleted', async () => {
    class StuckStorage extends FileStorage {
      override remove(): Promise<void> {
        return Promise.reject(new Error('disk busy'));
      }
    }
    const app = createApp({
      ...h.appOptions,
      services: { ...h.appOptions.services, storage: new StuckStorage(h.storageDir) },
    });
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    const first = await h.upload(UPLOAD, { id, version: 1 }, pdf('first.pdf'), cookie, app);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const second = await h.upload(
        UPLOAD,
        { id, version: first.data?.uploadManuscript.data.version },
        pdf('second.pdf'),
        cookie,
        app,
      );
      expect(second.data?.uploadManuscript.data.manuscript.fileName).toBe('second.pdf');
      expect(String(stderr.mock.calls[0]?.[0])).toMatch(/replaced manuscript file not removed/);
    } finally {
      stderr.mockRestore();
    }
    expect((await h.db.select().from(manuscripts)).map((m) => m.fileName)).toEqual(['second.pdf']);
  });

  it('rejects an upload against a stale version without keeping the file', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: {} }, cookie)).createDraft.data;
    await h.gql(SAVE, { id, version: 1, input: { title: 'Moved on' } }, cookie);
    const stale = await h.upload(UPLOAD, { id, version: 1 }, pdf(), cookie);
    expect(stale.data?.uploadManuscript.__typename).toBe('ConflictError');
    expect(await h.db.select().from(manuscripts)).toEqual([]);
  });
});

describe('workflow', () => {
  it('refuses to submit an incomplete draft and lists what is missing', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    const cookie = await h.signIn(author);
    const { id } = (await h.gql(CREATE, { input: { title: 'Half done' } }, cookie)).createDraft.data;
    const result = (await h.gql(SUBMIT, { id, version: 1 }, cookie)).submitSubmission;
    expect(result.__typename).toBe('IncompleteSubmissionError');
    expect(result.issues.map((i: { field: string }) => i.field)).toEqual(
      expect.arrayContaining(['form', 'synopsis', 'wordCount', 'file', 'season', 'bio', 'rightsConfirmed']),
    );
  });

  it('runs submit → claim → accept, notifying the author and locking fields', async () => {
    const ctx = await submitted();
    const claimed = (await h.gql(CLAIM, { id: ctx.id }, ctx.editorCookie)).claimSubmission.data;
    expect(claimed).toEqual({ status: 'IN_REVIEW', editor: { name: 'Hollis Beaumont' } });

    const tooSoon = (await h.gql(ACCEPT, { id: ctx.id, date: '2026-03-20' }, ctx.editorCookie))
      .acceptSubmission;
    expect(tooSoon.problems).toEqual([
      { field: 'releaseDate', message: 'Release dates must be at least 30 days away.' },
    ]);

    const accepted = (await h.gql(ACCEPT, { id: ctx.id, date: '2026-09-15' }, ctx.editorCookie))
      .acceptSubmission.data;
    expect(accepted).toMatchObject({ status: 'ACCEPTED', releaseDate: '2026-09-15' });
    expect(accepted.lockedFields).toEqual([
      'title',
      'form',
      'wordCount',
      'season',
      'timeSensitive',
      'scheduleNote',
      'rightsConfirmed',
      'file',
    ]);

    const inbox = (await h.gql('{ notifications { subject body readAt } }', {}, ctx.cookie)).notifications;
    expect(inbox[0].subject).toBe('Accepted: Salt Ledger');
    expect(inbox[0].body).toContain('Tuesday 15 September 2026');
    expect(inbox[0].readAt).toBeNull();

    const MARK =
      'mutation { markNotificationsRead { __typename ... on MutationMarkNotificationsReadSuccess { data } } }';
    expect((await h.gql(MARK, {}, ctx.cookie)).markNotificationsRead.data).toBe(inbox.length);
    expect((await h.gql(MARK, {}, ctx.cookie)).markNotificationsRead.data).toBe(0);
    const read = (await h.gql('{ notifications { readAt } }', {}, ctx.cookie)).notifications;
    expect(read.every((n: { readAt: string | null }) => n.readAt !== null)).toBe(true);
    expect((await h.gql(MARK, {})).markNotificationsRead.__typename).toBe('NotSignedInError');

    const locked = (
      await h.gql(
        SAVE,
        {
          id: ctx.id,
          version: accepted.version,
          input: { title: 'New title', bio: 'Updated biography for the jacket.' },
        },
        ctx.cookie,
      )
    ).saveDraft;
    expect(locked).toMatchObject({ __typename: 'LockedFieldError', fields: ['title'] });
    const bio = (
      await h.gql(
        SAVE,
        { id: ctx.id, version: accepted.version, input: { bio: 'Updated biography for the jacket.' } },
        ctx.cookie,
      )
    ).saveDraft;
    expect(bio.data.bio).toBe('Updated biography for the jacket.');
  });

  it('only lets the claiming editor decide, and requires a note to decline', async () => {
    const ctx = await submitted();
    await h.gql(CLAIM, { id: ctx.id }, ctx.editorCookie);
    const other = await h.signIn(await h.createUser('June Haldane', 'EDITOR'));
    expect((await h.gql(ACCEPT, { id: ctx.id, date: '2026-09-15' }, other)).acceptSubmission.__typename).toBe(
      'InvalidTransitionError',
    );
    expect(
      (await h.gql(DECLINE, { id: ctx.id, note: 'No.' }, ctx.editorCookie)).declineSubmission.__typename,
    ).toBe('ValidationError');

    const declined = (
      await h.gql(
        DECLINE,
        { id: ctx.id, note: 'Lovely images, but not right for this list.' },
        ctx.editorCookie,
      )
    ).declineSubmission;
    expect(declined.data.status).toBe('DECLINED');
    const revised = (await h.gql(REVISE, { id: ctx.id }, ctx.cookie)).reviseSubmission.data;
    expect(revised).toEqual({ status: 'DRAFT', rightsConfirmed: false });
  });

  it('rejects moves that are not in the workflow table, in plain words', async () => {
    const ctx = await submitted();
    expect((await h.gql(CLAIM, { id: ctx.id }, ctx.cookie)).claimSubmission).toEqual({
      __typename: 'InvalidTransitionError',
      message: 'A submission waiting for review cannot be claimed.',
    });
    expect((await h.gql(REVISE, { id: ctx.id }, ctx.cookie)).reviseSubmission.__typename).toBe(
      'InvalidTransitionError',
    );
    expect(
      (await h.gql(SUBMIT, { id: ctx.id, version: ctx.version }, ctx.cookie)).submitSubmission.__typename,
    ).toBe('InvalidTransitionError');
    expect(
      (await h.gql(SAVE, { id: ctx.id, version: ctx.version, input: { title: 'x' } }, ctx.cookie)).saveDraft,
    ).toMatchObject({
      __typename: 'InvalidTransitionError',
      message: 'A submission waiting for review cannot be edited.',
    });
  });

  it('answers a malformed id with NotFoundError on every workflow move', async () => {
    const ctx = await submitted();
    expect((await h.gql(CLAIM, { id: 'x' }, ctx.editorCookie)).claimSubmission.__typename).toBe(
      'NotFoundError',
    );
    expect(
      (await h.gql(SUBMIT, { id: '-'.repeat(36), version: 1 }, ctx.cookie)).submitSubmission.__typename,
    ).toBe('NotFoundError');
  });

  it('lets exactly one of two editors claiming at once win', async () => {
    const ctx = await submitted();
    const other = await h.signIn(await h.createUser('June Haldane', 'EDITOR'));
    const results = await Promise.all([
      h.gql(CLAIM, { id: ctx.id }, ctx.editorCookie),
      h.gql(CLAIM, { id: ctx.id }, other),
    ]);
    const kinds = results.map((r) => r.claimSubmission.__typename as string).sort();
    expect(kinds).toEqual(['InvalidTransitionError', 'MutationClaimSubmissionSuccess']);
    expect(results.find((r) => r.claimSubmission.message)?.claimSubmission.message).toBe(
      'A submission in review cannot be claimed.',
    );
  });

  it('lets an author withdraw a submission that nobody has claimed', async () => {
    const ctx = await submitted();
    const result = await h.gql(
      `mutation($id: ID!, $version: Int!) { withdrawSubmission(id: $id, version: $version) { __typename ... on MutationWithdrawSubmissionSuccess { data { status } } } }`,
      { id: ctx.id, version: ctx.version },
      ctx.cookie,
    );
    expect(result.withdrawSubmission.data.status).toBe('DRAFT');
  });

  it('keeps database invariants even if code skips the service', async () => {
    const ctx = await submitted();
    await expect(
      h.pool.query("UPDATE submissions SET status = 'ACCEPTED' WHERE id = $1", [ctx.id]),
    ).rejects.toThrow(/review_has_editor|accepted_has_release_date/);
    await expect(
      h.pool.query("UPDATE submissions SET status = 'DECLINED', editor_id = author_id WHERE id = $1", [
        ctx.id,
      ]),
    ).rejects.toThrow(/declined_has_note/);
  });
});

describe('review queue', () => {
  const QUEUE = `query($after: String, $statuses: [SubmissionStatus!]) { reviewQueue(first: 2, after: $after, statuses: $statuses) {
    __typename ... on QueryReviewQueueSuccess { data { nodes { title author { name } manuscript { fileName } } pageInfo { hasNextPage endCursor } } }
    ... on Error { message } } }`;

  async function queueWith(count: number) {
    const author = await h.createUser('Teodor Lindqvist', 'AUTHOR');
    const cookie = await h.signIn(author);
    for (let i = 1; i <= count; i += 1) {
      h.state.clock = () => new Date(Date.UTC(2026, 2, 1, 9, i));
      const { id } = (await h.gql(CREATE, { input: { ...COMPLETE_DRAFT, title: `Story ${i}` } }, cookie))
        .createDraft.data;
      await h.upload(UPLOAD, { id, version: 1 }, pdf(`story-${i}.pdf`), cookie);
      await h.gql(SUBMIT, { id, version: 2 }, cookie);
    }
    return h.signIn(await h.createUser('Hollis Beaumont', 'EDITOR'));
  }

  it('pages newest first with stable keyset cursors', async () => {
    const editor = await queueWith(5);
    const titles: string[] = [];
    let after: string | null = null;
    for (;;) {
      const page: any = (await h.gql(QUEUE, { after }, editor)).reviewQueue.data;
      titles.push(...page.nodes.map((n: { title: string }) => n.title));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }
    expect(titles).toEqual(['Story 5', 'Story 4', 'Story 3', 'Story 2', 'Story 1']);
  });

  it('loads authors and files in batches, not once per item', async () => {
    const editor = await queueWith(4);
    h.queries.length = 0;
    await h.gql(QUEUE, {}, editor);
    const small = h.queries.length;
    h.queries.length = 0;
    await h.gql(QUEUE.replace('first: 2', 'first: 4'), {}, editor);
    expect(h.queries.length).toBe(small);
  });

  it('filters by status, rejects bad cursors, and is for editors only', async () => {
    const editor = await queueWith(1);
    expect((await h.gql(QUEUE, { statuses: ['ACCEPTED'] }, editor)).reviewQueue.data.nodes).toEqual([]);
    expect((await h.gql(QUEUE, { after: 'garbage' }, editor)).reviewQueue.__typename).toBe('ValidationError');
    const author = await h.signIn(await h.createUser('Wren Calloway', 'AUTHOR'));
    expect((await h.gql(QUEUE, {}, author)).reviewQueue.__typename).toBe('ForbiddenError');
  });

  it('never shows drafts to editors', async () => {
    const author = await h.createUser('Wren Calloway', 'AUTHOR');
    await h.gql(CREATE, { input: { title: 'Private draft' } }, await h.signIn(author));
    const editor = await h.signIn(await h.createUser('Hollis Beaumont', 'EDITOR'));
    expect((await h.gql(QUEUE, {}, editor)).reviewQueue.data.nodes).toEqual([]);
  });

  it('pages correctly through equal and microsecond times written by SQL', async () => {
    const editor = await queueWith(3);
    // now() and other SQL writes keep microseconds, which a JavaScript Date would round away.
    await h.pool.query(
      `UPDATE submissions SET submitted_at = CASE title
         WHEN 'Story 1' THEN '2026-03-01 09:00:00.000001+00'::timestamptz
         ELSE '2026-03-01 09:00:00.000002+00'::timestamptz END`,
    );
    const expected = (
      await h.db
        .select({ title: submissions.title, id: submissions.id })
        .from(submissions)
        .orderBy(desc(submissions.submittedAt), desc(submissions.id))
    ).map((s) => s.title);
    const titles: string[] = [];
    let after: string | null = null;
    for (;;) {
      const page: any = (await h.gql(QUEUE, { after }, editor)).reviewQueue.data;
      titles.push(...page.nodes.map((n: { title: string }) => n.title));
      if (!page.pageInfo.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }
    expect(titles).toEqual(expected);
    expect(titles.at(-1)).toBe('Story 1');
  });
});
