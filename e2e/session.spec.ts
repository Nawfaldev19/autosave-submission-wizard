import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('signing out and in as someone else shows only their work', async ({ page }) => {
  await signIn(page, /Wren \(author\)/);
  await expect(page.getByRole('link', { name: 'Salt Ledger' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: /Hollis \(editor\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Hollis Beaumont');
  await expect(page.getByRole('banner')).not.toContainText('Wren Calloway');
  await expect(page.getByText('Salt Ledger')).toHaveCount(0);
});

test('the API answers GraphQL over POST only', async ({ page }) => {
  const overGet = await page.request.get(`/graphql?query=${encodeURIComponent('{ me { id } }')}`);
  expect(overGet.status()).toBe(405);
});

// Hollis, not Wren: sign-in attempts are limited per email, and the suite signs Wren in often.
test('signing in and opening a submission work with the keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();

  const isFocused = (el: Element) => el === document.activeElement;
  const hollis = page.getByRole('button', { name: /Hollis \(editor\)/ });
  for (let i = 0; i < 20 && !(await hollis.evaluate(isFocused)); i += 1) await page.keyboard.press('Tab');
  await expect(hollis).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeFocused();

  // Tab to the first submission in the queue and open it with Enter.
  const firstItem = page.locator('#main a[href^="/queue/"]').first();
  await expect(firstItem).toBeVisible();
  for (let i = 0; i < 20 && !(await firstItem.evaluate(isFocused)); i += 1) await page.keyboard.press('Tab');
  await expect(firstItem).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/queue\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('link', { name: '← Review queue' })).toBeVisible();
  // Focus moved into the new page (its main landmark while loading, else its heading).
  expect(await page.evaluate(() => document.activeElement?.closest('#main') !== null)).toBe(true);
});
