import { expect, test, type Page } from '@playwright/test';
import { signIn, signInAs } from './helpers';

// Teo and Hollis: sign-in attempts are limited per email, and other specs sign Wren in often.
const SIZES = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
] as const;

/** Fails when the page is wider than the window, naming the widest element to blame. */
async function expectNoSidewaysScroll(page: Page, what: string) {
  const layout = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const culprit = [...document.querySelectorAll<HTMLElement>('body *')].find(
      (el) => el.getBoundingClientRect().right > width + 1,
    );
    const widest = culprit ? `${culprit.tagName.toLowerCase()}.${culprit.className}` : 'unknown';
    return { scrollWidth: document.documentElement.scrollWidth, width, widest };
  });
  expect(layout.scrollWidth, `${what} scrolls sideways (${layout.widest})`).toBeLessThanOrEqual(layout.width);
}

test('key pages never scroll sideways on a phone or a tablet', async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage();
  const author = await (await browser.newContext()).newPage();
  const editor = await (await browser.newContext()).newPage();
  await signInAs(author, 'teo@example.com');
  await signIn(editor, /Hollis \(editor\)/);

  for (const size of SIZES) {
    for (const page of [visitor, author, editor]) await page.setViewportSize(size);

    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoSidewaysScroll(visitor, `${size.name}: sign-in`);

    await author.goto('/submissions');
    await expect(author.getByRole('link', { name: 'Allotment Weather' })).toBeVisible();
    await expectNoSidewaysScroll(author, `${size.name}: your submissions`);
    await author.getByRole('link', { name: 'Allotment Weather' }).click();
    await expect(author.getByRole('heading', { name: 'Allotment Weather' })).toBeVisible();
    await expectNoSidewaysScroll(author, `${size.name}: a submission`);

    await author.goto('/submissions/new/edit/basics');
    await author.getByRole('button', { name: 'Save and continue' }).click();
    await expect(author.getByText('Give your work a title.')).toBeVisible();
    await expectNoSidewaysScroll(author, `${size.name}: wizard with errors`);
    // Every step in the stepper stays a usable target (WCAG 2.2 target size, 24 by 24 CSS pixels).
    for (const step of await author
      .getByRole('navigation', { name: 'Submission steps' })
      .locator('a, span:has(> .stepper-dot)')
      .all()) {
      const box = await step.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(24);
      expect(box?.height).toBeGreaterThanOrEqual(24);
    }

    await editor.goto('/queue');
    await editor.getByRole('button', { name: 'In review' }).click();
    await expect(editor.getByRole('link', { name: 'Allotment Weather' })).toBeVisible();
    await expectNoSidewaysScroll(editor, `${size.name}: review queue`);
    await editor.getByRole('link', { name: 'Allotment Weather' }).click();
    await expect(editor.getByRole('heading', { name: 'Decline' })).toBeVisible();
    await expectNoSidewaysScroll(editor, `${size.name}: decision screen`);
  }
});
