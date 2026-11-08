/**
 * Calendar-date helpers shared by the browser and the server. A release date is
 * a date in the press's time zone, never an instant, so nothing here converts
 * through the viewer's zone.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `value` is a real calendar date written as `YYYY-MM-DD`.
 *
 * @param value - Text to check.
 * @returns `true` only for dates that exist (so `2026-02-30` is refused).
 * @example
 * ```ts
 * isIsoDate('2026-03-14'); // true
 * isIsoDate('2026-02-30'); // false
 * ```
 */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Today's date in `timeZone` at instant `now`.
 *
 * @param timeZone - An IANA zone name, for example `Europe/Dublin`.
 * @param now - The instant to read the date at; injected so tests can pin the clock.
 * @returns The calendar date as `YYYY-MM-DD`.
 * @throws `RangeError` for a zone name `Intl` does not know (the server checks it at start-up).
 * @remarks
 * A late-evening decision in Dublin is judged against Dublin's date, not UTC's.
 * @example
 * ```ts
 * todayIn('Pacific/Auckland', new Date('2026-03-10T12:00:00Z')); // '2026-03-11'
 * ```
 */
export function todayIn(timeZone: string, now: Date): string {
  // Built from parts rather than from a locale's formatted string, whose layout ICU may change.
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Adds whole days to a calendar date, without touching any time zone.
 *
 * @param isoDate - A `YYYY-MM-DD` date.
 * @param days - Days to add; negative values go back.
 * @returns The resulting `YYYY-MM-DD` date.
 * @example
 * ```ts
 * addDays('2026-01-31', 1); // '2026-02-01'
 * ```
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The latest release date an editor may choose, in days from today (about two years). */
export const MAX_RELEASE_DAYS_AHEAD = 730;

/**
 * Checks a proposed release date. A release must be at least 30 days out
 * (production time) and within {@link MAX_RELEASE_DAYS_AHEAD} days.
 *
 * @param isoDate - The proposed `YYYY-MM-DD` date.
 * @param today - Today's date in the press's time zone (see {@link todayIn}).
 * @returns A sentence describing the problem, or `null` when the date is acceptable.
 * @example
 * ```ts
 * releaseDateProblem('2026-03-20', '2026-03-10'); // 'Release dates must be at least 30 days away.'
 * ```
 * @see docs/reference/features.md (F-11)
 */
export function releaseDateProblem(isoDate: string, today: string): string | null {
  if (!isIsoDate(isoDate)) return 'Enter a real date (YYYY-MM-DD).';
  if (isoDate < addDays(today, 30)) return 'Release dates must be at least 30 days away.';
  if (isoDate > addDays(today, MAX_RELEASE_DAYS_AHEAD)) return 'Release dates must be within two years.';
  return null;
}

const calendarParts = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formats a calendar date as "Saturday 14 March 2026", independent of the viewer's zone.
 *
 * @param isoDate - A `YYYY-MM-DD` date.
 * @returns The long English form, with no comma after the weekday.
 * @remarks
 * Built from `formatToParts` because ICU versions disagree about the comma after the weekday.
 */
export function formatCalendarDate(isoDate: string): string {
  const parts = calendarParts.formatToParts(new Date(`${isoDate}T00:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`;
}
