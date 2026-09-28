import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createKey, listKeys, revokeKey } from '../api/keys';
import { useAuthSession } from '../components/auth-status';
import { ErrorNotice, LoadingList, Notice, SignedOutNotice } from '../components/feedback';

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
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function NewKeyBanner({ name, rawKey }: { name: string; rawKey: string }) {
  return (
    <div className="panel key-banner">
      <p><strong>Key「{name}」已创建。</strong>出于安全考虑，原文仅显示这一次，服务器只保存哈希。</p>
      <div className="key-row">
        <code>{rawKey}</code>
        <CopyButton value={rawKey} />
      </div>
      <p>立即把它配置到 MCP 客户端：</p>
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
        <label>Key 名称<input value={name} onChange={e => setName(e.target.value)}
          required maxLength={100} placeholder="例如：我的 CLI" disabled={pending} /></label>
        <button className="button" disabled={pending || !name.trim()}>
          {pending ? '正在创建…' : '创建 Key'}
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
      <span className="eyebrow">远程 MCP 客户端接入</span>
      <h1>MCP Keys</h1>
      <p>每个 Key 对应你的账号：用它调用的 MCP 工具只能读写你自己的 Context。创建后原文仅显示一次，请立即复制保存。</p>
      {auth.isPending && <LoadingList rows={2} />}
      {!auth.isPending && !auth.data?.user && <SignedOutNotice />}
      {auth.data?.user && <>
        <KeyForm pending={false} />
        <ErrorNotice error={query.error} />
        {query.isPending && <LoadingList rows={2} />}
        {keys && active.length === 0 && revoked.length === 0 && (
          <Notice title="还没有 Key">
            创建一个 API Key，把 MCP 客户端接入你的工作区。它只能读写你自己的 Context。
          </Notice>
        )}
        <div className="document-list">
          {active.map(key => (
            <div className="panel document-card" key={key.id}>
              <h2>{key.name}</h2>
              <p className="meta">创建于 {new Date(key.createdAt).toLocaleString()} · 最后使用 {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : '从未使用'}</p>
              <button type="button" className="user-logout" onClick={() => revoke.mutate(key.id)} disabled={revoke.isPending}>
                {revoke.isPending && revoke.variables === key.id ? '正在撤销…' : '撤销'}
              </button>
            </div>
          ))}
          {revoked.map(key => (
            <div className="panel document-card key-revoked" key={key.id}>
              <h2>{key.name}</h2>
              <p className="meta">已于 {new Date(key.revokedAt!).toLocaleString()} 撤销 · 该 Key 的请求会被拒绝</p>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
