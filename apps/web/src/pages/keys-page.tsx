import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createKey, listKeys, revokeKey } from '../api/keys';
import { useAuthSession } from '../components/auth-status';
import { ErrorNotice, LoadingList, Notice, SignedOutNotice } from '../components/feedback';
import { formatDateTime } from '../lib/format';

/** CLI clients talk to the API host directly, not the browser's web origin. */
const API_ORIGIN = import.meta.env.DEV
  ? 'http://127.0.0.1:3000'
  : 'https://contextport-server-sg.onrender.com';
const MCP_ENDPOINT = `${API_ORIGIN}/mcp`;
const REST_ENDPOINT = `${API_ORIGIN}/api/v1`;

function curlCommand(key: string, path: string) {
  return `curl -fsS -H 'Authorization: Bearer ${key}' '${REST_ENDPOINT}${path}'`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" className="button button-small" onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CommandRow({ command }: { command: string }) {
  return <div className="key-row key-command">
    <code>{command}</code>
    <CopyButton value={command} />
  </div>;
}

function NewKeyBanner({ name, rawKey }: { name: string; rawKey: string }) {
  const mcpCommand = `claude mcp add --transport http contextport ${MCP_ENDPOINT} --header "Authorization: Bearer ${rawKey}"`;
  return (
    <div className="panel key-banner">
      <p><strong>Key &quot;{name}&quot; created.</strong>For security it is shown only this once; the server stores just its hash.</p>
      <div className="key-row">
        <code>{rawKey}</code>
        <CopyButton value={rawKey} />
      </div>
      <h2>Quick access with curl</h2>
      <p>Give these commands to an Agent that can run curl. The REST API returns JSON and needs no MCP setup.</p>
      <p className="key-command-label">List your Contexts</p>
      <CommandRow command={curlCommand(rawKey, '/contexts?limit=50&offset=0')} />
      <p className="key-command-label">Read a Context and its Thread index</p>
      <CommandRow command={curlCommand(rawKey, '/contexts/<context-id>')} />
      <p className="key-command-label">Read a Thread</p>
      <CommandRow command={curlCommand(rawKey, '/contexts/<context-id>/threads/<thread-id>')} />
      <p className="key-command-label">Or configure an MCP client</p>
      <CommandRow command={mcpCommand} />
      <p className="panel-hint">Replace the IDs with values from the preceding response. These commands contain your key; share it only with an Agent you trust. Revoke the key below when access is no longer needed.</p>
    </div>
  );
}

function KeyForm({ pending }: { pending: boolean }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: () => createKey(name.trim()),
    onSuccess: (result) => {
      setCreated({ name: result.name, key: result.key });
      setName('');
      void client.invalidateQueries({ queryKey: ['auth', 'keys'] });
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) mutation.mutate();
  }
  return (
    <>
      <form className="task-form" onSubmit={submit}>
        <label>Key name<input value={name} onChange={e => setName(e.target.value)}
          required maxLength={100} placeholder="e.g. My CLI" disabled={pending} /></label>
        <button className="button" disabled={pending || !name.trim()}>
          {pending ? 'Creating…' : 'Create Key'}
        </button>
      </form>
      {created && <NewKeyBanner name={created.name} rawKey={created.key} />}
    </>
  );
}

export function KeysPage() {
  const auth = useAuthSession();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['auth', 'keys'],
    queryFn: listKeys,
    enabled: Boolean(auth.data?.user),
    refetchInterval: 10_000,
  });
  const keys = auth.data?.user ? query.data : undefined;
  const revoke = useMutation({
    mutationFn: revokeKey,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['auth', 'keys'] }),
  });
  const active = keys?.filter(key => !key.revokedAt) ?? [];
  const revoked = keys?.filter(key => key.revokedAt) ?? [];

  return (
    <div className="page">
      <span className="eyebrow">Connect agents</span>
      <h1>API Keys</h1>
      <p>Use a key with an MCP client or let an Agent call the REST API with curl. Each key can read and write only your own Contexts. A key is shown once, so copy it when you create it.</p>
      {auth.isPending && <LoadingList rows={2} />}
      {!auth.isPending && !auth.data?.user && <SignedOutNotice />}
      {auth.data?.user && <>
        <KeyForm pending={false} />
        <ErrorNotice error={query.error} />
        {query.isPending && <LoadingList rows={2} />}
        {keys && active.length === 0 && revoked.length === 0 && (
          <Notice title="No keys yet">
            Create an API key to let an Agent access your Contexts through curl or MCP.
          </Notice>
        )}
        <div className="document-list">
          {active.map(key => (
            <div className="panel document-card" key={key.id}>
              <h2>{key.name}</h2>
              <p className="meta">Created {formatDateTime(key.createdAt)} · Last used {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'never'}</p>
              <button type="button" className="user-logout" onClick={() => revoke.mutate(key.id)} disabled={revoke.isPending}>
                {revoke.isPending && revoke.variables === key.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
          {revoked.map(key => (
            <div className="panel document-card key-revoked" key={key.id}>
              <h2>{key.name}</h2>
              <p className="meta">Revoked on {formatDateTime(key.revokedAt!)} · requests with this key are rejected</p>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
