import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createKey, listKeys, revokeKey } from '../api/keys';
import { useAuthSession } from '../components/auth-status';
import { ErrorNotice, LoadingList, Notice, SignedOutNotice } from '../components/feedback';
import { formatDateTime } from '../lib/format';

/** Remote MCP clients talk to the API host directly (never through the web origin). */
const MCP_ENDPOINT = 'https://contextport-server-sg.onrender.com/mcp';

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

function NewKeyBanner({ name, rawKey }: { name: string; rawKey: string }) {
  return (
    <div className="panel key-banner">
      <p><strong>Key &quot;{name}&quot; created.</strong>For security it is shown only this once; the server stores just its hash.</p>
      <div className="key-row">
        <code>{rawKey}</code>
        <CopyButton value={rawKey} />
      </div>
      <p>Configure it in your MCP client now:</p>
      <div className="key-row">
        <code>{`claude mcp add --transport http contextport ${MCP_ENDPOINT} --header "Authorization: Bearer ${rawKey}"`}</code>
        <CopyButton value={`claude mcp add --transport http contextport ${MCP_ENDPOINT} --header "Authorization: Bearer ${rawKey}"`} />
      </div>
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
      <span className="eyebrow">Connect remote MCP clients</span>
      <h1>MCP Keys</h1>
      <p>Each key is scoped to your account: MCP tools called with it can only read and write your own Contexts. A key is shown once, so copy it when you create it.</p>
      {auth.isPending && <LoadingList rows={2} />}
      {!auth.isPending && !auth.data?.user && <SignedOutNotice />}
      {auth.data?.user && <>
        <KeyForm pending={false} />
        <ErrorNotice error={query.error} />
        {query.isPending && <LoadingList rows={2} />}
        {keys && active.length === 0 && revoked.length === 0 && (
          <Notice title="No keys yet">
            Create an API key to connect an MCP client to your workspace. It can only read and write your own Contexts.
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
