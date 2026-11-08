import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { render } from 'vitest-browser-react';
import { Header } from '../src/components/Header';
import { applyTheme, readTheme } from '../src/components/theme';

async function renderHeader() {
  const router = createMemoryRouter([{ path: '/', element: <Header pressName="Larkspur Press" /> }]);
  return render(<RouterProvider router={router} />);
}

describe('Header', () => {
  afterEach(() => {
    window.localStorage.removeItem('submission-wizard.theme');
    delete document.documentElement.dataset.theme;
  });

  it('cycles the theme from system to light to dark, naming the current one, and remembers it', async () => {
    const screen = await renderHeader();
    const toggle = screen.getByRole('button', { name: 'system theme. Switch theme' });
    await expect.element(toggle).toBeVisible();
    expect(document.documentElement.dataset.theme).toBeUndefined();

    await toggle.click();
    await expect.element(screen.getByRole('button', { name: 'light theme. Switch theme' })).toBeVisible();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('submission-wizard.theme')).toBe('light');

    await screen.getByRole('button', { name: 'light theme. Switch theme' }).click();
    expect(document.documentElement.dataset.theme).toBe('dark');

    await screen.getByRole('button', { name: 'dark theme. Switch theme' }).click();
    // Back to following the operating system: nothing forced, nothing stored.
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem('submission-wizard.theme')).toBeNull();
  });

  it('applies a remembered theme before any header renders', () => {
    window.localStorage.setItem('submission-wizard.theme', 'dark');
    applyTheme(readTheme());
    expect(document.documentElement.dataset.theme).toBe('dark');
    window.localStorage.setItem('submission-wizard.theme', 'sepia');
    expect(readTheme()).toBe('system');
  });

  it('names the signed-in person and their role, and keeps Sign out named on a phone', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <Header
            pressName="Larkspur Press"
            user={{ name: 'June Haldane', role: 'Editor' }}
            onSignOut={() => {}}
          />
        ),
      },
    ]);
    const screen = await render(<RouterProvider router={router} />);
    await expect.element(screen.getByText('June Haldane')).toBeVisible();
    await expect.element(screen.getByText('Editor', { exact: true })).toBeVisible();
    const label = screen.getByText('Sign out');

    await page.viewport(1024, 768);
    await expect.element(screen.getByText('Larkspur Press')).toBeVisible();
    expect(label.element().getBoundingClientRect().width).toBeGreaterThan(20);

    // Below 480px only the icon shows, and the press name goes; the button keeps its name.
    await page.viewport(375, 700);
    await expect.element(screen.getByText('Larkspur Press')).not.toBeVisible();
    expect(label.element().getBoundingClientRect().width).toBeLessThanOrEqual(1);
    await expect.element(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await page.viewport(414, 896);
  });
});
