/** The urql client factory: same-origin POST requests that always carry the CSRF header. */

import { cacheExchange, Client, fetchExchange } from 'urql';

const CSRF_HEADER = 'x-submission-wizard-csrf';

/**
 * urql with its document cache: any mutation that returns a Submission
 * invalidates cached queries that contain one, so lists refresh after edits.
 * File variables are sent with the GraphQL multipart request specification.
 * Queries go by POST too: the API refuses GraphQL over GET (see docs/security/threat-model.md).
 *
 * @param url - The GraphQL endpoint; same-origin by default (Vite proxies it to the API).
 * @see docs/adr/0008-urql-document-cache-replaced-per-session.md
 */
export function createClient(url = '/graphql'): Client {
  return new Client({
    url,
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false,
    fetchOptions: { credentials: 'same-origin', headers: { [CSRF_HEADER]: '1' } },
  });
}
