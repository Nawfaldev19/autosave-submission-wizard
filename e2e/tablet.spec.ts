import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

// Runs only in the `tablet` project (768 by 1024, touch). June and Teo, to spread sign-in attempts.

test('on a tablet, the queue filters show which one is on @tablet', async ({ page }) => {
  await signInAs(page, 'june@example.com');
  const decided = page.getByRole('button', { name: 'Decided' });
  await decided.click();
  await expect(decided).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Waiting' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('link', { name: 'The Lantern Year' }).click();
  await expect(page.getByRole('heading', { name: 'The Lantern Year' })).toBeVisible();
  await page.getByRole('link', { name: '← Review queue' }).click();
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeFocused();
});

test('on a tablet, the wizard’s steps fit on one line and the leave dialog fits the screen @tablet', async ({
  page,
}) => {
  await signInAs(page, 'teo@example.com');
  await page.getByRole('button', { name: 'New submission' }).click();
  const steps = page.getByRole('navigation', { name: 'Submission steps' }).getByRole('listitem');
  await expect(steps).toHaveCount(5);
  const tops = await steps.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);

  await page.getByLabel('Title').fill('Unsaved title');
  await page.getByRole('link', { name: /Submission Wizard/ }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
  await page.getByRole('button', { name: 'Stay on this step' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Unsaved title');
});
