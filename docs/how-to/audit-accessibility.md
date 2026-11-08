# Audit accessibility with axe-core

Runs [axe-core](https://github.com/dequelabs/axe-core)'s WCAG 2.0, 2.1 and 2.2 level A and AA rules over the main page states of the production build, in the light and dark themes. axe-core is licensed MPL-2.0 and this project keeps to permissive dependencies, so the audit is installed in a temporary folder outside the repository and is not part of the gate.

## 1. Start the API and the production build

Two terminals, from the repository root, with Postgres reachable as for [the tests](run-the-tests.md):

```bash
npm run db:setup                                  # fresh demo data
ALLOWED_ORIGINS=http://localhost:5280 npm run start --workspace @submission-wizard/server
```

```bash
npm run build --workspace @submission-wizard/web && npm run preview --workspace @submission-wizard/web
```

The preview server listens on <http://localhost:5280> and proxies the API on 4400.

## 2. Install the audit tools outside the repository

```bash
mkdir -p /tmp/submission-wizard-axe
npm install --prefix /tmp/submission-wizard-axe @axe-core/playwright@4.14.0 playwright-core@1.64.1
```

`playwright-core` matches the repository's Playwright version, so it uses the Chromium that `npx playwright install chromium` already downloaded.

## 3. Save and run the audit

Save this as `/tmp/submission-wizard-axe/audit.mjs`; Node resolves its imports from that folder.

```js
// Runs axe-core's WCAG 2.0, 2.1 and 2.2 level A and AA rules over the main page
// states of the preview build, in the light and dark themes.
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5280';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const browser = await chromium.launch({ channel: 'chromium' });
const found = [];
let states = 0;

async function audit(page, state) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  states += 1;
  for (const v of violations) found.push(`${state}: ${v.id} (${v.nodes.length}) ${v.help}`);
}

async function open(colorScheme, account) {
  const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
  if (account) await page.getByRole('button', { name: account }).click();
  return page;
}

for (const scheme of ['light', 'dark']) {
  let page = await open(scheme);
  await audit(page, `sign-in, ${scheme}`);
  await page.getByRole('button', { name: 'Wren (author)' }).click();
  await page.getByRole('heading', { name: 'Your submissions' }).waitFor();
  await audit(page, `your submissions, ${scheme}`);
  await page.getByRole('button', { name: 'Continue Salt Ledger' }).click();
  await page.getByLabel('Title').waitFor();
  const draft = page.url();
  for (const step of ['basics', 'manuscript', 'schedule', 'about', 'review']) {
    await page.goto(draft.replace(/edit\/[a-z]+$/, `edit/${step}`));
    await page.getByRole('heading', { level: 1 }).waitFor();
    await audit(page, `wizard ${step}, ${scheme}`);
  }
  await page.goto(`${BASE}/submissions`);
  await page.getByRole('link', { name: 'Tidewater Hymns' }).click();
  await page.getByRole('button', { name: 'Withdraw to edit' }).click();
  await page.getByRole('alertdialog').waitFor();
  await audit(page, `withdraw question, ${scheme}`);
  await page.getByRole('button', { name: 'Keep it submitted' }).click();
  await page.goto(`${BASE}/submissions`);
  await page.getByRole('link', { name: 'The Lantern Year' }).click();
  await page.getByRole('button', { name: 'Why is title locked?' }).click();
  await audit(page, `accepted submission, ${scheme}`);
  await page.goto(`${BASE}/no-such-page`);
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  await audit(page, `page not found, ${scheme}`);
  await page.context().close();

  page = await open(scheme, 'Hollis (editor)');
  await page.getByRole('heading', { name: 'Review queue' }).waitFor();
  await audit(page, `review queue, ${scheme}`);
  await page.getByRole('button', { name: 'In review' }).click();
  await page.getByRole('link', { name: 'Allotment Weather' }).click();
  await page.getByRole('heading', { name: 'Accept' }).waitFor();
  await audit(page, `decision, ${scheme}`);
  await page.context().close();
}

await browser.close();
console.log(`${states} page states audited, ${found.length} violations`);
for (const line of found) console.log(line);
process.exitCode = found.length > 0 ? 1 : 0;
```

```bash
node /tmp/submission-wizard-axe/audit.mjs
```

It prints how many states it audited and one line per violation, and exits with status 1 if there are any. It only reads: the withdraw question is opened and cancelled, and nothing is saved. Stop both servers afterwards.

## Last result

**2026-10-17: 0 violations across 24 page states.** Each of these was audited in the light and the dark theme at 1280×900: the sign-in page; an author's list and inbox; the five wizard steps of a draft; the withdraw question; an accepted submission with a locked field explained; the not-found page; the review queue; and the decision screen of a claimed submission.
