# Reset the demo data

```bash
npm run db:setup
```

This creates the database if needed, applies any pending migrations and loads the demo data. **It empties every table and deletes the stored manuscripts first**, so never run it against data you want to keep.

- **Which database:** `SUBMISSION_WIZARD_DATABASE` if set, else the one in `DATABASE_URL`, else `submission_wizard_development` (see [configuration](../reference/configuration.md)).
- **What it loads:** four fictional accounts (two authors, two editors; password `submission-wizard-demo-pass`), five submissions in different statuses, their sample manuscripts and one message ([`seed.ts`](../../server/src/db/seed.ts)).
- **Storage:** only files in `STORAGE_DIR` whose names look like storage keys (UUIDs) are deleted.

## Docker Compose

The `server` service runs the seed with `--if-empty`, so restarting the stack keeps your changes. To start over:

```bash
docker compose down -v   # removes the database and package volumes
docker compose up
```

## Only migrations

```bash
npm run migrate --workspace @submission-wizard/server
```

Applies pending files from `server/src/db/migrations` without touching data.
