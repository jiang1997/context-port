import { useEffect, useRef, useState } from 'react';

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
    <span className={compact ? 'context-id context-id-compact' : 'context-id'}>
      <code
        className="context-id-code"
        title={compact ? contextId : undefined}
        aria-label={compact ? `Context ID ${contextId}` : undefined}
      >
        {compact && status !== 'failed' ? shortContextId(contextId) : contextId}
      </code>
      <button
        type="button"
        className="button button-small copy-id-button"
        onClick={handleClick}
        aria-label={`复制 Context ID ${contextId}`}
        title="复制完整 Context ID"
      >
        {status === 'copied' ? '已复制' : '复制 ID'}
      </button>
      <span role="status" aria-live="polite" className="copy-id-feedback">
        {status === 'copied' ? '已复制 Context ID' : status === 'failed' ? '复制失败，请手动选择复制完整 ID' : ''}
      </span>
    </span>
  );
}
