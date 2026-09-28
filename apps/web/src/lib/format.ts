/**
 * Date and time formatting for the UI.
 *
 * The product targets an English-speaking audience and ships a single set of
 * English strings, so dates are pinned to the same locale. Left to follow the
 * browser, a reader on a zh-CN system would get an English interface with
 * Chinese dates, which reads as a bug rather than as localisation.
 */
export const LOCALE = 'en';

const RELATIVE_UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Compact relative time for list rows: "3 days ago" instead of
 * "9/25/2026, 12:00:00 PM". Returns an empty string for unparseable input so a
 * bad timestamp degrades to nothing rather than to "Invalid Date".
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';

  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  const delta = then - now;
  const magnitude = Math.abs(delta);
  // Zero of any unit resolves to "this minute"/"this hour" rather than "now",
  // so sub-minute deltas are expressed in seconds to get the shorter form.
  if (magnitude < 60_000) return formatter.format(0, 'second');

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (magnitude >= ms) return formatter.format(Math.round(delta / ms), unit);
  }
  return formatter.format(Math.round(delta / 60_000), 'minute');
}

/** Full date and time, for tooltips and detail rows. Empty string if unparseable. */
export function formatDateTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toLocaleString(LOCALE);
}
