import { formatDateTime, formatRelativeTime } from '../lib/format';

/**
 * Renders relative time inside a <time> element: the exact timestamp stays
 * available on hover and to assistive tech, while the row itself stays short.
 */
export function RelativeTime({ value }: { value: string }) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return (
    <time dateTime={value} title={formatDateTime(value)}>
      {formatRelativeTime(value)}
    </time>
  );
}
