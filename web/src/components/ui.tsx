/** Small presentational building blocks shared by every page. */

import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * A button that defaults to `type="button"` and shows a busy state.
 *
 * @remarks While `busy`, it is disabled and sets `aria-busy`, so a second click cannot send twice.
 */
export function Button({
  variant = 'secondary',
  busy = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** The look; `secondary` by default. */
  variant?: Variant;
  /** Disables the button while an action runs. */
  busy?: boolean;
  /** An icon drawn before the label; mark it `aria-hidden`. */
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`k-button k-button-${variant}${className ? ` ${className}` : ''}`}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

const NOTICE_ICON = { info: Info, error: CircleAlert, success: CircleCheck } as const;

/**
 * A message box. Errors are announced at once (`role="alert"`). Other tones are
 * plain page content; a page announces a new success message with `useAnnounce`.
 */
export function Notice({
  tone = 'info',
  children,
}: {
  /** Colour, icon and announcement style. */
  tone?: 'info' | 'error' | 'success';
  /** The message. */
  children: ReactNode;
}) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div className={`k-notice k-notice-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** A skeleton placeholder announced as a status with `label`. */
export function Loading({
  label,
}: {
  /** What is loading, for screen readers ("Loading your draft"). */
  label: string;
}) {
  return (
    <div className="k-stack" role="status" aria-label={label}>
      <div className="k-skeleton" style={{ height: 28, width: '40%' }} />
      <div className="k-skeleton" style={{ height: 52 }} />
      <div className="k-skeleton" style={{ height: 52 }} />
    </div>
  );
}

/**
 * The page's main landmark. The skip link targets its id, and focus moves into
 * it after in-app navigation.
 */
export function Main({
  className,
  children,
}: {
  /** Extra classes for the page's layout. */
  className?: string;
  /** The page. */
  children: ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className={`k-main${className ? ` ${className}` : ''}`}>
      {children}
    </main>
  );
}

/** An empty or not-found state with a heading and an optional way onward. */
export function Empty({
  title,
  level = 2,
  children,
}: {
  /** The heading. */
  title: string;
  /** 1 when this is the whole page (not found, wrong role), so the page still has an `h1`. */
  level?: 1 | 2;
  /** Usually a link onward. */
  children?: ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="k-empty">
      <Heading>{title}</Heading>
      {children}
    </div>
  );
}
