/** The colour theme: reading the remembered choice and applying it to the document. */

/** `system` follows `prefers-color-scheme`; the others override it. */
export type Theme = 'system' | 'light' | 'dark';

const KEY = 'submission-wizard.theme';

/** The remembered theme, or `system` when none is stored or storage is blocked. */
export function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Applies a theme to `<html data-theme>` and, when `remember` is set, stores it.
 *
 * @remarks
 * main.tsx calls this before the first render, so the loading screen already
 * uses the remembered theme instead of flashing the system one.
 */
export function applyTheme(theme: Theme, remember = false): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  if (!remember) return;
  try {
    if (theme === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}
