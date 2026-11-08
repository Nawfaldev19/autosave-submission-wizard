import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page, account: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: account }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/**
 * Signs in through the form, for accounts without a one-click button. Sign-in
 * attempts are limited per email, so specs spread their sign-ins across accounts.
 */
export async function signInAs(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('submission-wizard-demo-pass');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

export const PDF = {
  name: 'harbour-lights.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\nA tiny test manuscript\n%%EOF'),
};

/** Fills and saves step 1 of a new submission, returning on step 2. */
export async function startDraft(page: Page, title: string) {
  await page.goto('/submissions');
  await page.getByRole('button', { name: 'New submission' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Kind of work').selectOption('ESSAY');
  await page
    .getByLabel('Synopsis')
    .fill('An essay about the volunteers who keep a small harbour lit through the winter storms.');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Step 2 of 5: Manuscript' })).toBeVisible();
}
