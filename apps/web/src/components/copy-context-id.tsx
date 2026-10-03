import { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useI18n } from '../i18n';

export function shortContextId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }
  try {
    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyContextIdButton({ contextId, compact = false }: { contextId: string; compact?: boolean }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const ok = await copyTextToClipboard(contextId);
    setStatus(ok ? 'copied' : 'failed');
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (ok) {
      timer.current = window.setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <Stack direction="horizontal" gap={2} vAlign="center" wrap="wrap">
      <Text type="code" maxLines={1}>
        {compact && status !== 'failed' ? shortContextId(contextId) : contextId}
      </Text>
      <Button
        label={status === 'copied' ? t('@app.common.copied') : t('@app.common.copyId')}
        variant="secondary"
        size="sm"
        onClick={handleClick}
        tooltip={t('@app.common.copyIdTooltip')}
      />
      <Text type="supporting" aria-live="polite">
        {status === 'failed' ? t('@app.common.copyIdManual') : ''}
      </Text>
    </Stack>
  );
}
