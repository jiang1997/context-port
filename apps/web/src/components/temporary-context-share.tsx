import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useI18n } from '../i18n';
import { buildTemporaryContextAgentInstructions, resolveTemporaryContextApiBase } from '../lib/temporary-context-agent';
import { buildTemporaryContextShareUrl } from '../lib/temporary-context-url';
import { copyTextToClipboard } from './copy-context-id';

type CopyKind = 'passphrase' | 'agent' | 'link';
type ShareFocus = 'heading' | 'agent' | 'link';

export function TemporaryContextShare({ passphrase, expiresAt }: { passphrase: string; expiresAt: string }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const passphraseInput = useRef<HTMLTextAreaElement>(null);
  const agentDetails = useRef<HTMLDetailsElement>(null);
  const agentPrompt = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<{ focus: ShareFocus; prompt: string } | null>(null);
  const [copying, setCopying] = useState(false);
  const [result, setResult] = useState<{ kind: CopyKind; status: 'copied' | 'failed' } | null>(null);
  const shareUrl = buildTemporaryContextShareUrl(window.location.href, passphrase);

  function agentInstructions() {
    return buildTemporaryContextAgentInstructions(passphrase, resolveTemporaryContextApiBase(), expiresAt, locale);
  }

  useLayoutEffect(() => {
    if (!panel || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    if (panel.focus === 'agent' && agentDetails.current) {
      agentDetails.current.open = true;
      agentPrompt.current?.focus();
    } else if (panel.focus === 'link') {
      linkInput.current?.focus();
    } else {
      heading.current?.focus();
    }
  }, [panel]);

  useEffect(() => {
    if (result?.status !== 'copied') return;
    const timer = window.setTimeout(() => setResult(null), 2000);
    return () => window.clearTimeout(timer);
  }, [result]);

  function openPanel(focus: ShareFocus, trigger: HTMLButtonElement, prompt = agentInstructions()) {
    returnFocus.current = trigger;
    setPanel({ focus, prompt });
  }

  function closePanel() {
    setPanel(null);
    setResult(current => current?.status === 'failed' ? null : current);
    returnFocus.current?.focus();
  }

  async function copy(kind: CopyKind, value: string, event: MouseEvent<HTMLButtonElement>) {
    if (copying) return;
    const trigger = event.currentTarget;
    setCopying(true);
    setResult(null);
    const ok = await copyTextToClipboard(value);
    setCopying(false);
    if (kind === 'passphrase' && !dialog.current?.open) return;
    setResult({ kind, status: ok ? 'copied' : 'failed' });
    if (!ok) {
      if (kind === 'passphrase') {
        passphraseInput.current?.focus();
      } else if (kind === 'agent') {
        openPanel('agent', trigger, value);
      } else {
        openPanel('link', trigger);
      }
    }
  }

  const copied = result?.status === 'copied' ? result.kind : null;

  return (
    <>
      <div className="temporary-share-actions" role="group" aria-label={t('@app.temp.shareHeading')}>
        <Button label={copied === 'agent' ? t('@app.temp.copiedForAgent') : t('@app.temp.copyForAgent')} variant="secondary" size="sm" onClick={event => void copy('agent', agentInstructions(), event)} tooltip={t('@app.temp.copyForAgentTooltip')} />
        <Button label={copied === 'link' ? t('@app.temp.copiedLink') : t('@app.temp.copyLink')} variant="secondary" size="sm" onClick={event => void copy('link', shareUrl, event)} />
        <button type="button" className="temporary-share-trigger" aria-haspopup="dialog" onClick={event => openPanel('heading', event.currentTarget)}>
          {t('@app.temp.shareDetails')}
        </button>
        <span className="temporary-live-status" role="status">
          {copied === 'agent' && t('@app.temp.copiedForAgent')}
          {copied === 'link' && t('@app.temp.copiedLink')}
        </span>
      </div>
      <dialog ref={dialog} className="temporary-share-dialog" aria-labelledby={headingId} onClose={closePanel}>
        {panel && (
          <Stack gap={3}>
            <div className="temporary-share-dialog-heading">
              <h2 id={headingId} ref={heading} tabIndex={-1}>{t('@app.temp.shareHeading')}</h2>
              <Button label={t('@app.temp.closeShare')} variant="ghost" size="sm" onClick={() => dialog.current?.close()} />
            </div>
            {result?.status === 'failed' && (
              <Text type="supporting" role="alert">{t('@app.temp.copyManual')}</Text>
            )}
            <div className="temporary-share-contents">
              <TemporaryShareQr url={shareUrl} />
              <Stack gap={3}>
                <label className="temporary-share-field">
                  {t('@app.temp.shareLink')}
                  <input ref={linkInput} type="text" value={shareUrl} readOnly onFocus={event => event.currentTarget.select()} />
                </label>
                <label className="temporary-share-field">
                  {t('@app.temp.currentPassphrase')}
                  <textarea ref={passphraseInput} rows={1} wrap="off" value={passphrase} readOnly onFocus={event => event.currentTarget.select()} />
                </label>
                <div>
                  <Button label={copied === 'passphrase' ? t('@app.temp.copiedPassphrase') : t('@app.temp.copyPassphrase')} variant="secondary" size="sm" onClick={event => void copy('passphrase', passphrase, event)} />
                  <span className="temporary-live-status" role="status">{copied === 'passphrase' && t('@app.temp.copiedPassphrase')}</span>
                </div>
              </Stack>
            </div>
            <Text type="supporting">{t('@app.temp.keepSafe')}</Text>
            <details className="temporary-share-examples" ref={agentDetails}>
              <summary>{t('@app.temp.agentExamples')}</summary>
              <label className="temporary-share-field">
                {t('@app.temp.agentPrompt')}
                <textarea ref={agentPrompt} rows={8} value={panel.prompt} readOnly onFocus={event => event.currentTarget.select()} />
              </label>
            </details>
          </Stack>
        )}
      </dialog>
    </>
  );
}

function TemporaryShareQr({ url }: { url: string }) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    void import('uqr').then(({ encode }) => {
      if (cancelled) return;
      const image = canvas.current;
      const context = image?.getContext('2d');
      if (!image || !context) {
        setState('error');
        return;
      }
      const { data } = encode(url, { ecc: 'L', border: 4 });
      const scale = 6;
      image.width = image.height = data.length * scale;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, image.width, image.height);
      context.fillStyle = '#000';
      data.forEach((row, y) => row.forEach((dark, x) => {
        if (dark) context.fillRect(x * scale, y * scale, scale, scale);
      }));
      setState('ready');
    }).catch(() => {
      if (!cancelled) setState('error');
    });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="temporary-share-qr">
      <canvas ref={canvas} hidden={state !== 'ready'} role="img" aria-label={t('@app.temp.qrLabel')} />
      {state !== 'ready' && <Text type="supporting" role="status">{t(state === 'loading' ? '@app.temp.qrLoading' : '@app.temp.qrUnavailable')}</Text>}
    </div>
  );
}
