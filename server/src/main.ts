/** Process entry point: wires configuration into the Yoga app and serves it over Node's HTTP server. */

import { createServer } from 'node:http';
import { config } from './config';
import { createDb, createPool, DEFAULT_DATABASE } from './db/client';
import { FileStorage } from './domain/storage';
import { createApp } from './http/app';
import { log } from './logger';

const pool = createPool();
const app = createApp({
  services: {
    db: createDb(pool),
    storage: new FileStorage(config.storageDir),
    pressName: config.pressName,
    pressTimeZone: config.pressTimeZone,
    now: () => new Date(),
  },
  sessionSecret: config.sessionSecret,
  allowedOrigins: config.allowedOrigins,
  secureCookies: config.secureCookies,
  trustProxy: config.trustProxy,
  production: config.production,
});

const server = createServer((request, response) => {
  void app(request, response);
});
server.listen(config.port, () => {
  log('info', 'submission_wizard server listening', {
    port: config.port,
    database: config.databaseName ?? (config.databaseUrl ? 'from DATABASE_URL' : DEFAULT_DATABASE),
  });
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
