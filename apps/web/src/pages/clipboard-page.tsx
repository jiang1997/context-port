import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Clipboard } from '@contextport/contracts';
import { apiRequest } from '../api/client';
import { ErrorNotice, Skeleton } from '../components/feedback';
import { MarkdownContent } from '../components/markdown-content';

type GeneratedClipboard = Clipboard & { passphrase: string };

export function ClipboardPage() {
  const [entry, setEntry] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [addition, setAddition] = useState('');
  const [copied, setCopied] = useState(false);
  const read = useQuery({
    queryKey: ['clipboard', passphrase],
    queryFn: () => apiRequest<Clipboard>('/clipboard/read', { method: 'POST', body: JSON.stringify({ passphrase }) }),
    enabled: Boolean(passphrase),
    refetchInterval: 5000,
  });
  const open = useMutation({
    mutationFn: (value: string) => apiRequest<Clipboard>('/clipboard/open', { method: 'POST', body: JSON.stringify({ passphrase: value }) }),
    onSuccess: (_data, value) => { setPassphrase(value); setCopied(false); },
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GeneratedClipboard>('/clipboard/generate', { method: 'POST' }),
    onSuccess: data => { setEntry(data.passphrase); setPassphrase(data.passphrase); setCopied(false); },
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
    await navigator.clipboard.writeText(passphrase);
    setCopied(true);
  }
  return <div className="page page-narrow">
    <span className="eyebrow">No account needed</span>
    <h1>Temporary Context</h1>
    <p>Share a passphrase with another person or Agent to read and add to the same Context. It expires 24 hours after creation.</p>
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
        <div className="form-actions"><code className="context-id-code">{passphrase}</code><button className="button button-secondary button-small" onClick={() => void copyPassphrase()}>{copied ? 'Copied' : 'Copy'}</button></div>
        <p className="panel-hint">The passphrase is your only way back. Keep it somewhere safe until this Context expires.</p>
        <button className="button button-secondary button-small" onClick={() => { setPassphrase(''); setEntry(''); setAddition(''); }}>Leave Context</button>
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
