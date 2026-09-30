import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Clipboard } from '@contextport/contracts';
import { apiRequest } from '../api/client';
import { copyTextToClipboard } from '../components/copy-context-id';
import { ErrorNotice, Skeleton } from '../components/feedback';
import { MarkdownContent } from '../components/markdown-content';

type GeneratedClipboard = Clipboard & { passphrase: string };

function resolveClipboardApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured?.startsWith('http')) return configured.replace(/\/$/, '');
  const pathBase = configured && configured.startsWith('/') ? configured : '/api/v1';
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${pathBase}`;
  }
  return pathBase;
}

/** Wrap a JSON payload in single quotes, escaping embedded single quotes for sh/bash/zsh. */
function shellQuotedJson(payload: string): string {
  return `'${payload.replace(/'/g, `'\"'\"'`)}'`;
}

export function buildClipboardAgentInstructions(passphrase: string, apiBase: string, expiresAt?: string): string {
  const readPayload = shellQuotedJson(JSON.stringify({ passphrase }));
  const appendPayload = shellQuotedJson(JSON.stringify({ passphrase, content: 'YOUR TEXT HERE' }));
  return [
    'You have access to a shared Temporary Context.',
    '',
    `Passphrase: ${passphrase}`,
    `API base: ${apiBase}`,
    ...(expiresAt ? [`Expires: ${expiresAt}`] : []),
    '',
    'Read the current content:',
    `curl -s -X POST "${apiBase}/clipboard/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    'Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
    `curl -s -X POST "${apiBase}/clipboard/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    'Notes for agent:',
    '- No login needed, the passphrase is the credential. Keep it secret.',
    '- `read` returns JSON { content, version, expiresAt }.',
    '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
  ].join('\n');
}

export function buildClipboardAgentGuide(apiBase: string): string {
  return [
    'Temporary Context lets any person or agent share short-lived text without login. It expires 24 hours after creation.',
    '',
    `API base: ${apiBase}`,
    '',
    '1. Create a new Context (server generates a random passphrase):',
    `curl -s -X POST "${apiBase}/clipboard/generate"`,
    '→ returns JSON { passphrase, content, version, expiresAt }. Save the passphrase — it is the only credential.',
    '',
    'Or create / enter with your own passphrase (12-128 characters):',
    `curl -s -X POST "${apiBase}/clipboard/open" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE"}'`,
    '',
    '2. Read the current content:',
    `curl -s -X POST "${apiBase}/clipboard/read" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE"}'`,
    '',
    '3. Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
    `curl -s -X POST "${apiBase}/clipboard/append" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE","content":"YOUR TEXT HERE"}'`,
    '',
    'Rules for agent:',
    '- No login needed; the passphrase is the credential. Keep it secret.',
    '- `read` returns JSON { content, version, expiresAt }.',
    '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
    '- Rate limit is 60 requests/min per IP.',
  ].join('\n');
}

export function ClipboardPage() {
  const [entry, setEntry] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [addition, setAddition] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedForAgent, setCopiedForAgent] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const read = useQuery({
    queryKey: ['clipboard', passphrase],
    queryFn: () => apiRequest<Clipboard>('/clipboard/read', { method: 'POST', body: JSON.stringify({ passphrase }) }),
    enabled: Boolean(passphrase),
    refetchInterval: 5000,
  });
  const open = useMutation({
    mutationFn: (value: string) => apiRequest<Clipboard>('/clipboard/open', { method: 'POST', body: JSON.stringify({ passphrase: value }) }),
    onSuccess: (_data, value) => { setPassphrase(value); setCopied(false); setCopiedForAgent(false); },
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GeneratedClipboard>('/clipboard/generate', { method: 'POST' }),
    onSuccess: data => { setEntry(data.passphrase); setPassphrase(data.passphrase); setCopied(false); setCopiedForAgent(false); },
  });
  const append = useMutation({
    mutationFn: (content: string) => apiRequest<Clipboard>('/clipboard/append', {
      method: 'POST', body: JSON.stringify({ passphrase, content }),
    }),
    onSuccess: async () => { setAddition(''); await read.refetch(); },
  });
  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entry.length >= 12) open.mutate(entry);
  }
  function submitAddition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addition) append.mutate(addition);
  }
  async function copyPassphrase() {
    const ok = await copyTextToClipboard(passphrase);
    if (ok) setCopied(true);
  }
  async function copyForAgent() {
    const instructions = buildClipboardAgentInstructions(passphrase, resolveClipboardApiBase(), read.data?.expiresAt);
    const ok = await copyTextToClipboard(instructions);
    if (ok) setCopiedForAgent(true);
  }
  async function copyAgentGuide() {
    const ok = await copyTextToClipboard(buildClipboardAgentGuide(resolveClipboardApiBase()));
    if (ok) setCopiedGuide(true);
  }
  return <div className="page page-narrow">
    <span className="eyebrow">No account needed</span>
    <h1>Temporary Context</h1>
    <p>Share a passphrase with another person or Agent to read and add to the same Context. It expires 24 hours after creation.</p>
    <section className="panel clipboard-access">
      <h2>Use with an agent</h2>
      <p className="panel-hint">No login needed — copy the guide and paste it to your agent.</p>
      <ol className="agent-steps panel-hint">
        <li>Create: <code className="context-id-code">POST /clipboard/generate</code> (random passphrase) or <code className="context-id-code">POST /clipboard/open</code> (your own 12–128 char passphrase).</li>
        <li>Read: <code className="context-id-code">POST /clipboard/read</code> with <code className="context-id-code">{'{ "passphrase" }'}</code>.</li>
        <li>Append: <code className="context-id-code">POST /clipboard/append</code> with <code className="context-id-code">{'{ "passphrase", "content" }'}</code>.</li>
      </ol>
      <div className="form-actions">
        <button className="button button-secondary button-small" onClick={() => void copyAgentGuide()}>{copiedGuide ? 'Copied' : 'Copy agent guide'}</button>
        <span role="status" aria-live="polite" className="copy-id-feedback">{copiedGuide ? 'Agent guide with curl commands copied.' : ''}</span>
      </div>
    </section>
    {!passphrase ? <section className="panel clipboard-entry">
      <h2>Open a Context</h2>
      <form className="task-form" onSubmit={submitEntry}>
        <label>Passphrase<input type="text" value={entry} onChange={event => setEntry(event.target.value)} minLength={12} maxLength={128} required autoComplete="off" placeholder="At least 12 characters" /></label>
        <div className="form-actions">
          <button className="button" disabled={open.isPending}>Create or enter</button>
          <button className="button button-secondary" type="button" disabled={generate.isPending} onClick={() => generate.mutate()}>Generate a passphrase</button>
        </div>
      </form>
      <p className="panel-hint">Anyone with this passphrase can read and write. Use the generated option for private content.</p>
      <ErrorNotice error={open.error ?? generate.error} />
    </section> : <>
      <section className="panel clipboard-access">
        <h2>Share this passphrase</h2>
        <div className="form-actions"><code className="context-id-code">{passphrase}</code><button className="button button-secondary button-small" onClick={() => void copyPassphrase()}>{copied ? 'Copied' : 'Copy'}</button><button className="button button-secondary button-small" onClick={() => void copyForAgent()} title="Copy curl instructions for read + append so an agent can use this Context">{copiedForAgent ? 'Copied for agent' : 'Copy for agent'}</button></div>
        <p className="panel-hint">The passphrase is your only way back. Keep it somewhere safe until this Context expires. Use “Copy for agent” to share curl commands for reading and appending.</p>
        <span role="status" aria-live="polite" className="copy-id-feedback">{copiedForAgent ? 'Agent instructions with curl commands copied.' : ''}</span>
        <div className="form-actions"><button className="button button-secondary button-small" onClick={() => { setPassphrase(''); setEntry(''); setAddition(''); setCopied(false); setCopiedForAgent(false); }}>Leave Context</button></div>
      </section>
      <ErrorNotice error={read.error} />
      {read.isPending && <Skeleton lines={4} />}
      {read.data && !read.error && <>
        <p className="meta clipboard-expiry">Expires {new Date(read.data.expiresAt).toLocaleString()} · version {read.data.version}</p>
        <section className="panel"><h2>Shared content</h2><MarkdownContent content={read.data.content} /></section>
        <form className="task-form panel clipboard-compose" onSubmit={submitAddition}>
          <label>Add to Context<textarea value={addition} onChange={event => setAddition(event.target.value)} rows={7} maxLength={20_000} required /></label>
          <ErrorNotice error={append.error} />
          <button className="button" disabled={append.isPending}>{append.isPending ? 'Adding…' : 'Add content'}</button>
        </form>
      </>}
    </>}
  </div>;
}
