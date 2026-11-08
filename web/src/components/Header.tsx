/** The page header: skip link, brand, the signed-in user, the theme switch and Sign out. */

import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { applyTheme, readTheme, type Theme } from './theme';
import { Button } from './ui';

const ORDER: readonly Theme[] = ['system', 'light', 'dark'];

/**
 * The page header.
 *
 * @remarks
 * The theme cycles system → light → dark and is remembered in `localStorage`
 * when storage is available; "system" follows `prefers-color-scheme`. On a
 * phone the press name is dropped and Sign out shows its icon only, so the
 * header never scrolls sideways.
 * @see docs/reference/features.md (F-12)
 */
export function Header({
  pressName,
  user,
  onSignOut,
}: {
  /** Shown beside the brand on screens wider than a phone. */
  pressName?: string | undefined;
  /** The signed-in person's name and role ("Author" or "Editor"); omitted on the sign-in page. */
  user?: { name: string; role: string };
  /** Shows the Sign out button when given. */
  onSignOut?: () => void;
}) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme, true);
  }, [theme]);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="k-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link className="k-brand" to="/">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="var(--color-primary)" />
          <path
            d="M10 8h10a4 4 0 0 1 4 4v12H14a4 4 0 0 1-4-4z"
            fill="none"
            stroke="var(--color-on-primary)"
            strokeWidth="2.2"
          />
          <path d="M14 13h6M14 17h6" stroke="var(--color-accent)" strokeWidth="2" />
        </svg>
        Submission Wizard {pressName && <span className="k-brand-sub">{pressName}</span>}
      </Link>
      <div className="k-header-end">
        {user && (
          <span className="k-user">
            <span className="k-user-name">{user.name}</span>
            <span className="k-user-role">{user.role}</span>
          </span>
        )}
        <Button
          variant="ghost"
          aria-label={`${theme} theme. Switch theme`}
          icon={<Icon size={18} aria-hidden="true" />}
          onClick={() => {
            setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length] ?? 'system');
          }}
        />
        {onSignOut && (
          <Button variant="ghost" icon={<LogOut size={18} aria-hidden="true" />} onClick={onSignOut}>
            {/* On a phone only the icon shows; the name stays for screen readers and tests. */}
            <span className="k-header-label">Sign out</span>
          </Button>
        )}
      </div>
    </header>
  );
}
