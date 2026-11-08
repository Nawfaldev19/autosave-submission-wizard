import { expect, test } from '@playwright/test';
import { PDF, signIn, startDraft } from './helpers';

test('an author completes all five steps and submits @mobile', async ({ page }) => {
  await signIn(page, /Wren \(author\)/);
  await startDraft(page, 'Harbour Lights');
  await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}\/edit\/manuscript$/);

  await page.getByLabel('Manuscript file').setInputFiles(PDF);
  await expect(page.getByText('harbour-lights.pdf')).toBeVisible();
  await page.getByLabel('Word count').fill('8400');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await page.getByLabel('Autumn list').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await page
    .getByLabel('Short biography')
    .fill('Writes about harbours and the people who keep them working.');
  await page.getByLabel(/I wrote this work/).check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByText('Everything is in place.')).toBeVisible();
  await page.getByRole('button', { name: 'Submit to Larkspur Press' }).click();
  await expect(page.getByText(/Submitted\. We will let you know/)).toBeVisible();
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
});

test('a saved draft resumes, and Fix links jump to the missing field', async ({ page }) => {
  await signIn(page, /Wren \(author\)/);
  await page.getByRole('button', { name: 'Continue Salt Ledger' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Salt Ledger');
  await page.getByRole('link', { name: /Review and submit/ }).click();
  await expect(page.getByRole('heading', { name: /Still needed/ })).toBeVisible();
  await page.getByRole('link', { name: 'Fix Short biography' }).click();
  await expect(page.getByLabel('Short biography')).toBeFocused();
});

test('a stale tab cannot overwrite a newer save', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await signIn(first, /Wren \(author\)/);
  await startDraft(first, 'Two Tabs');
  const basics = first.url().replace(/manuscript$/, 'basics');
  const second = await context.newPage();
  await first.goto(basics);
  await second.goto(basics);

  await first.getByLabel('Title').fill('Saved in the first tab');
  await first.getByRole('button', { name: 'Save and continue' }).click();
  await expect(first.getByRole('heading', { name: /Step 2/ })).toBeVisible();

  await second.getByLabel('Title').fill('Typed in the second tab');
  await second.getByRole('button', { name: 'Save and continue' }).click();
  await expect(second.getByText(/changed since you opened it/)).toBeVisible();
  await second.getByRole('button', { name: 'Reload latest version' }).click();
  await expect(second.getByLabel('Title')).toHaveValue('Saved in the first tab');
});

test('a disguised binary is rejected however it is named', async ({ page }) => {
  await signIn(page, /Wren \(author\)/);
  await startDraft(page, 'Wrong File');
  await page.getByLabel('Manuscript file').setInputFiles({
    name: 'novel.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from([0x4d, 0x5a, 0x00, 0x01]),
  });
  await expect(page.getByText('Upload a PDF or a plain-text (UTF-8) file.')).toBeVisible();
});

test('after acceptance, locked fields explain themselves and the bio can still change', async ({ page }) => {
  await signIn(page, /Wren \(author\)/);
  await page.getByRole('link', { name: 'The Lantern Year' }).click();
  await page.getByRole('button', { name: 'Why is title locked?' }).click();
  await expect(page.getByText(/Locked after acceptance/).first()).toBeVisible();
  await page
    .getByLabel('Short biography')
    .fill('Writes about lanterns, winters and the towns that keep each other going.');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.getByText('Details updated.')).toBeVisible();
});
