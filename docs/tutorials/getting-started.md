# Getting started

In about fifteen minutes you will run Submission Wizard locally, submit a piece as an author, accept it as an editor, and see the decision arrive in the author's inbox. No prior knowledge of the code is needed.

## 1. Install

You need Node 22.12+ or 24+, and a PostgreSQL server you can reach (local, or in a container; CI tests version 16). Then, in the repository folder:

```bash
npm ci
```

**Expected:** npm installs the three workspaces (`shared`, `server`, `web`) and ends without errors.

## 2. Point at Postgres and load the demo data

If your Postgres is not the libpq default, export its details first, for example `export PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres`. Then:

```bash
npm run db:setup
```

**Expected:** a log line `seeded demo data` with `"users":4,"submissions":5`. This created `submission_wizard_development`, applied the migrations and loaded fictional data. (It empties that database each time, so it is safe to repeat.)

## 3. Start the app

```bash
npm run dev
```

**Expected:** the API listens on <http://localhost:4400> (<http://localhost:4400/healthz> answers `ok`) and the web app on <http://localhost:5180>. Ctrl-C stops both.

## 4. Submit as an author

1. Open <http://localhost:5180>. You see the sign-in page with one-click demo buttons.
2. Press **Wren (author)**. **Expected:** "Your submissions", with a draft (_Salt Ledger_), a submitted piece and an accepted one, and a message in the inbox.
3. Press **New submission**. On **Step 1 of 5: Basics**, enter a title, choose a kind of work, and write a synopsis of at least 50 characters. Press **Save and continue**. **Expected:** the address changes from `/submissions/new/…` to `/submissions/<id>/edit/manuscript`: the draft exists now.
4. Upload any small PDF or `.txt` file and enter a word count (for example `8,400`). **Save and continue.**
5. Choose a list on **Schedule**, then write a short biography and tick the rights confirmation on **About you**.
6. **Review and submit** shows "Everything is in place." Press **Submit to Larkspur Press**. **Expected:** "Submitted. We will let you know when an editor has read it."

Try the review step on _Salt Ledger_ too: it lists what is still missing, and each **Fix** link opens the right step with the field focused.

## 5. Decide as an editor

1. Press **Sign out**, then **Hollis (editor)**. **Expected:** the **Review queue**, newest first, including your submission.
2. Open your submission and press **Claim for review**. **Expected:** "You are now reviewing this submission."
3. Keep the suggested release date (30 days from today in the press's time zone) and press **Accept and schedule**. **Expected:** "Accepted. The author has been told."

## 6. See the decision as the author

Sign out, sign in as **Wren (author)** again. **Expected:** a new message, "Accepted: <your title>", saying when it will be released. Open the submission: most fields are now locked, each with a button explaining why, while the synopsis, pen name and biography can still change.

## 7. See concurrency protection (optional)

Open one of Wren's drafts in two tabs. Change the title and save in the first; then change it and save in the second. **Expected:** the second tab says the submission changed since you opened it, keeps what you typed, and offers **Reload latest version**.

## Where next

- How it works: [architecture](../explanation/architecture.md) and [the wizard and concurrency](../explanation/wizard-and-concurrency.md).
- Every feature, with its code and tests: [feature catalogue](../reference/features.md).
- Run the checks: [run the tests](../how-to/run-the-tests.md).
