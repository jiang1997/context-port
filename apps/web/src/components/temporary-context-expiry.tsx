import { useEffect, useState } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { useI18n } from '../i18n';
import { formatDateTime } from '../lib/format';

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export function TemporaryContextExpiry({ expiresAt, version }: { expiresAt: string; version: number }) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remaining = Date.parse(expiresAt) - now;
  const unit = remaining >= day ? 'day' : remaining >= hour ? 'hour' : 'minute';
  const amount = unit === 'day' ? Math.round(remaining / day) : Math.ceil(remaining / (unit === 'hour' ? hour : minute));
  const date = formatDateTime(expiresAt, locale);
  const expiry = remaining > 0
    ? t('@app.temp.expiryRemaining', { time: new Intl.RelativeTimeFormat(locale).format(amount, unit) })
    : t('@app.temp.expired');

  return (
    <div className="temporary-workspace-status">
      {date && (
        <details className="temporary-expiry">
          <summary><Badge variant={remaining > 0 ? 'success' : 'neutral'} label={expiry} /></summary>
          <div className="temporary-expiry-details">
            <time dateTime={expiresAt}>{t('@app.temp.expiryExact', { date })}</time>
            <Text type="supporting">{t('@app.temp.renewal')}</Text>
          </div>
        </details>
      )}
      <Text type="supporting">{t('@app.temp.version', { version })}</Text>
    </div>
  );
}
