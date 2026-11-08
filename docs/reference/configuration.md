# Configuration

Every setting is an environment variable. Nothing reads a `.env` file: export variables in your shell, or set them in `docker-compose.yml`. [`.env.example`](../../.env.example) lists them with placeholder values only.

## Server

Parsed once at start-up with Zod in [`server/src/config.ts`](../../server/src/config.ts). An invalid value stops the process with a message naming every bad variable, so nothing fails later inside a request. An empty value counts as unset.

| Name                                       | Default                                                        | Required               | Description                                                                                                                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                     | `4400`                                                         | no                     | Port the API listens on, 1 to 65535. The end-to-end suite uses `4401`.                                                                                                                                                                                      |
| `NODE_ENV`                                 | unset                                                          | no                     | `production` makes `SESSION_SECRET` required, turns `Secure` cookies on by default and refuses introspection. `test` silences `info` logs ([`logger.ts`](../../server/src/logger.ts)). Neither Docker Compose nor `npm start` sets it.                      |
| `DATABASE_URL`                             | unset                                                          | no                     | A `postgres://` or `postgresql://` URL. Without it the standard `PG*` variables apply. When a database name is also chosen (below, or by the test harness), only the URL's host and credentials are used ([`db/client.ts`](../../server/src/db/client.ts)). |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` | libpq defaults                                                 | no                     | Standard node-postgres connection variables, used when `DATABASE_URL` is unset.                                                                                                                                                                             |
| `SUBMISSION_WIZARD_DATABASE`               | `submission_wizard_development` (when `DATABASE_URL` is unset) | no                     | Database name. Overrides the one in `DATABASE_URL`. Tests always use `submission_wizard_test`; the end-to-end suite uses `submission_wizard_e2e`.                                                                                                           |
| `SESSION_SECRET`                           | a fixed development placeholder                                | **yes, in production** | HMAC key for session tokens. With `NODE_ENV=production` the process refuses to start without one, with one shorter than 32 bytes, or with one of the example values in this repository. Generate one with `openssl rand -base64 48`.                        |
| `SESSION_COOKIE_SECURE`                    | `true` when `NODE_ENV=production`, else `false`                | no                     | `true` or `false`. Adds `Secure` to the session cookie; set `false` only for plain-HTTP local runs.                                                                                                                                                         |
| `TRUST_PROXY`                              | `false`                                                        | no                     | `false`, `true` (one proxy) or the number of proxies you control that append to `x-forwarded-for`. Rate limits then key on the entry that many places from the right, which the client cannot forge. Never set it when clients can reach the API directly.  |
| `ALLOWED_ORIGINS`                          | `http://localhost:5180`                                        | no                     | Comma-separated browser origins allowed by CORS and by the origin guard, such as `https://press.example.com`. Spaces are trimmed; an entry with a path or a trailing slash is refused.                                                                      |
| `STORAGE_DIR`                              | `server/storage/`                                              | no                     | Folder for manuscript files. A relative path resolves from the folder the server starts in (`server/` under `npm run dev`). Reseeding deletes the files in it whose names look like storage keys. Any folder named `storage` is ignored by Git.             |
| `PRESS_TIME_ZONE`                          | `Europe/Dublin`                                                | no                     | IANA time zone that decides "today" for release dates; an unknown zone is refused at start-up.                                                                                                                                                              |

The press name (`Larkspur Press`) is a constant in `config.ts`, not a variable.

## Web (Vite dev and preview servers)

| Name                        | Default                 | Required | Description                                                                                                                                             |
| --------------------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUBMISSION_WIZARD_API_URL` | `http://localhost:4400` | no       | Where the Vite dev (`5180`) and preview (`5280`) servers proxy `/graphql` and `/manuscripts`. Read in [`web/vite.config.ts`](../../web/vite.config.ts). |

The proxy appends the browser's address to `x-forwarded-for`, so an API started with `TRUST_PROXY=1` behind it gives each browser its own sign-in budget instead of one shared by every browser. The same file sets the web servers' [headers](../security/threat-model.md#http-security-headers).

## Tests

| Name                       | Default            | Description                                                                                                             |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright's cache | Where Chromium is installed; set it if browsers live elsewhere.                                                         |
| `CI`                       | unset              | Makes Playwright refuse `test.only` and use the GitHub reporter ([`playwright.config.ts`](../../playwright.config.ts)). |

## Ports

| Port | Used by                                                        |
| ---- | -------------------------------------------------------------- |
| 4400 | API (`npm run dev`, Docker Compose)                            |
| 5180 | Web dev server                                                 |
| 4401 | API for the end-to-end suite                                   |
| 5280 | Web preview server for the end-to-end suite (production build) |
