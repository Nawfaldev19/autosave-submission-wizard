import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('an editor claims and accepts a submission, and the author is told', async ({ page, browser }) => {
  await signIn(page, /Hollis \(editor\)/);
  await page.getByRole('link', { name: 'Tidewater Hymns' }).click();
  await page.getByRole('button', { name: 'Claim for review' }).click();
  await expect(page.getByText('You are now reviewing this submission.')).toBeVisible();
  await expect(page.getByText(/^Releases on /)).toBeVisible();
  await page.getByRole('button', { name: 'Accept and schedule' }).click();
  await expect(page.getByText('Accepted. The author has been told.')).toBeVisible();

  const author = await (await browser.newContext()).newPage();
  await signIn(author, /Wren \(author\)/);
  await author.getByText('Accepted: Tidewater Hymns').click();
  await expect(author.getByText(/scheduled for release on/)).toBeVisible();
});

test('declining needs a real note', async ({ page }) => {
  await signIn(page, /Hollis \(editor\)/);
  await page.getByRole('link', { name: 'Small Engines' }).click();
  await page.getByRole('button', { name: 'Claim for review' }).click();
  await page.getByLabel('Note to the author').fill('No.');
  await page.getByRole('button', { name: 'Decline with note' }).click();
  await expect(page.getByText(/Write a note for the author/).first()).toBeVisible();
  await page
    .getByLabel('Note to the author')
    .fill('Strong voice, but we cannot place nine stories on next year’s list.');
  await page.getByRole('button', { name: 'Decline with note' }).click();
  await expect(page.getByText('Declined. The author has your note.')).toBeVisible();
  await page.getByRole('link', { name: '← Review queue' }).click();
  await page.getByRole('button', { name: 'Decided' }).click();
  await expect(page.getByRole('link', { name: 'Small Engines' })).toBeVisible();
});

test('roles stay in their lanes', async ({ page, browser }) => {
  await signIn(page, /Wren \(author\)/);
  const draftHref = await page.getByRole('link', { name: 'Salt Ledger' }).getAttribute('href');
  const draftId = draftHref?.split('/')[2] ?? '';
  await page.goto('/queue');
  await expect(page).toHaveURL(/\/submissions$/);

  const editor = await (await browser.newContext()).newPage();
  await signIn(editor, /Hollis \(editor\)/);
  await editor.goto(`/queue/${draftId}`);
  await expect(editor.getByRole('heading', { name: 'Submission not found' })).toBeVisible();
});
