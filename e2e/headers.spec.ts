import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

// The production build, served by `vite preview`, under its Content Security Policy.
test('the app is served with a strict CSP and runs without violating it', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  const response = await page.goto('/');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

  // Signing in exercises scripts, styles, fonts and the proxied API under the policy.
  // Hollis, not Wren: sign-in attempts are limited per email, and the suite signs Wren in often.
  await signIn(page, /Hollis \(editor\)/);
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
  expect(violations).toEqual([]);
});

test('API responses through the proxy keep the API’s own headers', async ({ page }) => {
  const response = await page.request.post('/graphql', {
    headers: { 'content-type': 'application/json', 'x-submission-wizard-csrf': '1' },
    data: { query: '{ press { name } }' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-security-policy']).toBe(
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
});
