import { useI18n } from '../i18n';
import { formatDateTime, formatRelativeTime } from '../lib/format';

/**
 * Renders relative time inside a <time> element: the exact timestamp stays
 * available on hover and to assistive tech, while the row itself stays short.
 * Both forms follow the active UI locale.
 */
export function RelativeTime({ value }: { value: string }) {
  const { locale } = useI18n();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return (
    <time dateTime={value} title={formatDateTime(value, locale)}>
      {formatRelativeTime(value, locale)}
    </time>
  );
}
