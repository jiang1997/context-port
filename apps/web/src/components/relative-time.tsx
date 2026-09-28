const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/**
 * Compact relative time for list rows: "3 分钟前" instead of
 * "2026/9/28 01:56:00". Returns an empty string for unparseable input so a
 * bad timestamp degrades to nothing rather than to "Invalid Date".
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';

  const delta = then - now;
  const magnitude = Math.abs(delta);
  if (magnitude < 60_000) return '刚刚';

  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) return formatter.format(Math.round(delta / ms), unit);
  }
  return formatter.format(Math.round(delta / 60_000), 'minute');
}

/**
 * Renders relative time inside a <time> element: the exact timestamp stays
 * available on hover and to assistive tech, while the row itself stays short.
 */
export function RelativeTime({ value }: { value: string }) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return (
    <time dateTime={value} title={new Date(parsed).toLocaleString()}>
      {formatRelativeTime(value)}
    </time>
  );
}
