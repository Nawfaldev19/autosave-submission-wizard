/**
 * The HTTP application: GraphQL Yoga with the plugins that guard and shape
 * every request (health, security headers, origin/CSRF guards, downloads,
 * cookies, introspection) and the per-request context.
 */

import { MAX_UPLOAD_BYTES } from '@submission-wizard/shared';
import { GraphQLError, type ValidationRule } from 'graphql';
import { createYoga, type Plugin } from 'graphql-yoga';
import { eq, sql } from 'drizzle-orm';
import { readSessionToken, SESSION_COOKIE } from '../auth/session';
import type { Db } from '../db/client';
import { manuscripts, submissions, users } from '../db/schema';
import { getSubmission, isUuid, type Services } from '../domain/submissions';
import type { Viewer } from '../domain/viewer';
import { log } from '../logger';
import { createLoaders, type Context } from '../graphql/context';
import { schema } from '../graphql/schema';

/**
 * The custom header every GraphQL POST must carry. Its value is not checked:
 * its presence proves the request passed CORS (forms cannot add headers).
 *
 * @see docs/adr/0007-signed-cookie-sessions-csrf-header-and-revocation.md
 */
export const CSRF_HEADER = 'x-submission-wizard-csrf';
const GRAPHQL_ENDPOINT = '/graphql';

interface AppOptions {
  /** Database, storage, clock and press settings. */
  readonly services: Services;
  /** Signs and verifies session tokens. */
  readonly sessionSecret: string;
  /** Browser origins that may call the API (CORS and the origin guard). */
  readonly allowedOrigins: readonly string[];
  /** Adds `Secure` to the session cookie. */
  readonly secureCookies?: boolean;
  /**
   * How many proxies you control sit in front of the server and append to
   * `x-forwarded-for`. 0 (the default) ignores the header.
   */
  readonly trustProxy?: number;
  /** Turns off schema introspection. */
  readonly production?: boolean;
}

/** What the Node adapter passes along with each request; absent when tests call `app.fetch`. */
interface ServerContext {
  readonly req?: { readonly socket: { readonly remoteAddress?: string | undefined } };
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

async function viewerFor(services: Services, request: Request, secret: string): Promise<Viewer | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const claims = readSessionToken(token, secret, services.now().getTime());
  if (!claims) return null;
  const [user] = await services.db.select().from(users).where(eq(users.id, claims.userId));
  if (!user) return null;
  // Signing out revokes every token issued before it, not just the cookie in that browser.
  if (user.sessionsValidAfter && claims.issuedAt < user.sessionsValidAfter.getTime()) return null;
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}

function json(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ errors: [{ message }] }), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * The API sends JSON and file downloads only, never HTML, so its CSP allows
 * nothing at all. The other headers stop framing, MIME sniffing, referrer
 * leaks and cross-origin embedding. A header a handler already set is kept.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/** Adds {@link SECURITY_HEADERS} to every response, early ones (403, 405, 404, health) included. */
const securityHeaders: Plugin = {
  onResponse({ response }) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!response.headers.has(name)) response.headers.set(name, value);
    }
  },
};

/** Healthy only when the database answers, so a container is not reported ready too early. */
function healthCheck(db: Db): Plugin {
  return {
    async onRequest(hook) {
      if (hook.url.pathname !== '/healthz') return;
      try {
        await db.execute(sql`select 1`);
        hook.endResponse(new Response('ok'));
      } catch {
        hook.endResponse(new Response('database unavailable', { status: 503 }));
      }
    },
  };
}

/**
 * Cross-site request forgery defence:
 * - an `Origin` outside the allow-list is refused, whatever the method or path;
 * - GraphQL is served over POST only, so a cross-site page cannot read data
 *   through a simple GET that carries the session cookie;
 * - every POST needs a custom header, which a cross-site form cannot add and a
 *   cross-site fetch cannot add without a preflight that CORS only approves for
 *   the allowed origins.
 */
function requestGuards(allowedOrigins: readonly string[]): Plugin {
  return {
    onRequest(hook) {
      const { request, url } = hook;
      const endResponse = (response: Response) => {
        hook.endResponse(response);
      };
      const origin = request.headers.get('origin');
      if (origin && !allowedOrigins.includes(origin)) {
        endResponse(json(403, 'Origin not allowed'));
        return;
      }
      if (url.pathname !== GRAPHQL_ENDPOINT) return;
      if (request.method === 'GET' || request.method === 'HEAD') {
        endResponse(json(405, 'GraphQL is served over POST only', { allow: 'POST' }));
        return;
      }
      if (request.method === 'POST' && !request.headers.get(CSRF_HEADER)) {
        endResponse(json(400, `Missing ${CSRF_HEADER} header`));
      }
    },
  };
}

/**
 * `filename` gets an ASCII fallback; `filename*` (RFC 8187) carries the real
 * UTF-8 name, which browsers prefer when they understand it.
 */
function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Streams a manuscript to its author or an editor, never guessing the content type. */
function manuscriptDownloads(options: AppOptions): Plugin {
  return {
    async onRequest(hook) {
      const { request, url } = hook;
      const endResponse = (response: Response) => {
        hook.endResponse(response);
      };
      const match = /^\/manuscripts\/([^/]+)$/.exec(url.pathname);
      if (!match || request.method !== 'GET') return;
      const id = match[1] ?? '';
      const { db } = options.services;
      let file: typeof manuscripts.$inferSelect | undefined;
      try {
        // Anything but a UUID is not found, before Postgres sees it.
        if (!isUuid(id)) throw new Error('not found');
        const viewer = await viewerFor(options.services, request, options.sessionSecret);
        [file] = await db.select().from(manuscripts).where(eq(manuscripts.id, id));
        const [owner] = file
          ? await db.select().from(submissions).where(eq(submissions.manuscriptId, file.id))
          : [];
        if (!file || !owner) throw new Error('not found');
        await getSubmission(db, viewer, owner.id);
      } catch {
        endResponse(json(404, 'Not found'));
        return;
      }
      const bytes = await options.services.storage.read(file.storageKey);
      endResponse(
        new Response(new Uint8Array(bytes), {
          headers: {
            // Text is UTF-8 by the upload check, so say so rather than let the browser guess.
            'content-type': file.mediaType === 'text/plain' ? 'text/plain; charset=utf-8' : file.mediaType,
            'content-disposition': contentDisposition(file.fileName),
            'x-content-type-options': 'nosniff',
            // `sandbox` also disarms a file opened directly in a browser tab.
            'content-security-policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
            'cache-control': 'private, no-store',
          },
        }),
      );
    },
  };
}

const pendingCookies = new WeakMap<Request, string[]>();

/** Lets resolvers set the session cookie without access to the raw response. */
const sessionCookies: Plugin = {
  onResponse({ request, response }) {
    for (const cookie of pendingCookies.get(request) ?? []) response.headers.append('set-cookie', cookie);
  },
};

/**
 * Production does not describe its own schema; the client is generated from
 * schema.graphql. (graphql's own NoSchemaIntrospectionCustomRule compares type
 * objects, which fails when the ESM and CommonJS builds of graphql are both loaded.)
 */
const refuseIntrospection: ValidationRule = (context) => ({
  Field(node) {
    if (node.name.value === '__schema' || node.name.value === '__type') {
      context.reportError(new GraphQLError('Introspection is turned off.', { nodes: node }));
    }
  },
});

const noIntrospection: Plugin = {
  onValidate({ addValidationRule }) {
    addValidationRule(refuseIntrospection);
  },
};

/**
 * The rate-limit key for a request. Each trusted proxy appends the address it
 * received the request from, so the entry `trustedHops` from the right is the
 * one the nearest untrusted party cannot forge; anything further left is
 * whatever the client sent.
 */
function clientAddress(request: Request, server: ServerContext, trustedHops: number): string {
  const socket = server.req?.socket.remoteAddress || 'local';
  if (trustedHops < 1) return socket;
  const entries = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.at(-trustedHops) ?? socket;
}

/**
 * Builds the Yoga application. It is a fetch handler (`app.fetch`, used by the
 * tests) and a Node request listener (used by main.ts).
 *
 * @param options - Services and security settings; see docs/reference/configuration.md.
 * @remarks
 * CORS allows only `allowedOrigins`, with credentials, for POST. Bodies over one
 * manuscript plus 64 KB are refused before they are buffered. Unexpected errors are masked.
 * @see docs/security/threat-model.md
 */
export function createApp(options: AppOptions) {
  return createYoga<ServerContext, Context>({
    schema,
    graphqlEndpoint: GRAPHQL_ENDPOINT,
    landingPage: false,
    // GraphiQL is a GET page that sends no CSRF header, so it could not work here anyway.
    graphiql: false,
    maskedErrors: true,
    // Yoga's default reflects any origin with credentials; only the app's own origins may read responses.
    cors: {
      origin: [...options.allowedOrigins],
      credentials: true,
      methods: ['POST'],
      allowedHeaders: ['content-type', CSRF_HEADER],
    },
    // One manuscript plus the multipart envelope. Larger bodies get 413 before they are buffered.
    maxRequestBodySize: MAX_UPLOAD_BYTES + 64 * 1024,
    plugins: [
      securityHeaders,
      healthCheck(options.services.db),
      requestGuards(options.allowedOrigins),
      manuscriptDownloads(options),
      sessionCookies,
      ...(options.production ? [noIntrospection] : []),
    ],
    logging: {
      debug: () => undefined,
      info: () => undefined,
      warn: (...args: unknown[]) => {
        log('warn', 'graphql warning', { detail: args.map(String) });
      },
      error: (...args: unknown[]) => {
        log('error', 'graphql error', { detail: args.map(String) });
      },
    },
    context: async ({ request, ...server }) => {
      const cookies: string[] = [];
      pendingCookies.set(request, cookies);
      return {
        services: options.services,
        viewer: await viewerFor(options.services, request, options.sessionSecret),
        loaders: createLoaders(options.services.db),
        setCookie: (cookie: string) => cookies.push(cookie),
        clientAddress: clientAddress(request, server, options.trustProxy ?? 0),
        sessionSecret: options.sessionSecret,
        secureCookies: options.secureCookies === true,
      };
    },
  });
}
