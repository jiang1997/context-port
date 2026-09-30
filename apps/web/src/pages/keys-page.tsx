import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Layout } from '@astryxdesign/core/Layout';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { createKey, listKeys, revokeKey } from '../api/keys';
import { useAuthSession } from '../components/auth-status';
import { copyTextToClipboard } from '../components/copy-context-id';
import { ErrorNotice, LoadingList, SignedOutNotice } from '../components/feedback';
import { formatDateTime } from '../lib/format';

const API_ORIGIN = import.meta.env.DEV
  ? 'http://127.0.0.1:3000'
  : 'https://contextport-server-sg.onrender.com';
const MCP_ENDPOINT = `${API_ORIGIN}/mcp`;
const REST_ENDPOINT = `${API_ORIGIN}/api/v1`;

function curlCommand(key: string, path: string) {
  return `curl -fsS -H 'Authorization: Bearer ${key}' '${REST_ENDPOINT}${path}'`;
}

// Long unbroken commands and keys must wrap and take the remaining width next
// to the Copy button, so they stay fully readable and selectable.
const codeRowStyle = { flex: '1 1 0%', minWidth: 0, wordBreak: 'break-all' } as const;

function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  async function copy() {
    // Shared helper: falls back to a hidden textarea when the async clipboard
    // API is unavailable (plain HTTP dev, restricted iframes).
    const ok = await copyTextToClipboard(value);
    setStatus(ok ? 'copied' : 'failed');
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (ok) timer.current = window.setTimeout(() => setStatus('idle'), 2000);
  }
  return (
    <Button
      label={status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
      variant="secondary"
      size="sm"
      onClick={() => void copy()}
    />
  );
}

function CommandRow({ command }: { command: string }) {
  return (
    <Stack direction="horizontal" gap={2} vAlign="start" wrap="wrap">
      <Text type="code" style={codeRowStyle}>{command}</Text>
      <CopyButton value={command} />
    </Stack>
  );
}

function NewKeyBanner({ name, rawKey }: { name: string; rawKey: string }) {
  const mcpCommand = `claude mcp add --transport http contextport ${MCP_ENDPOINT} --header "Authorization: Bearer ${rawKey}"`;
  return (
    <Card>
      <Stack gap={3}>
        <Text type="body"><strong>Key &quot;{name}&quot; created.</strong> For security it is shown only this once.</Text>
        <Stack direction="horizontal" gap={2} vAlign="start">
          <Text type="code" style={codeRowStyle}>{rawKey}</Text>
          <CopyButton value={rawKey} />
        </Stack>
        <Heading level={2}>Quick access with curl</Heading>
        <Text type="supporting">Give these commands to an Agent that can run curl.</Text>
        <Text type="label">List your Contexts</Text>
        <CommandRow command={curlCommand(rawKey, '/contexts?limit=50&offset=0')} />
        <Text type="label">Read a Context and its Thread index</Text>
        <CommandRow command={curlCommand(rawKey, '/contexts/<context-id>')} />
        <Text type="label">Read a Thread</Text>
        <CommandRow command={curlCommand(rawKey, '/contexts/<context-id>/threads/<thread-id>')} />
        <Text type="label">Or configure an MCP client</Text>
        <CommandRow command={mcpCommand} />
      </Stack>
    </Card>
  );
}

function KeyForm({ pending }: { pending: boolean }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
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
    if (!name.trim()) {
      setNameError('Give the key a name before creating it.');
      return;
    }
    setNameError(null);
    mutation.mutate();
  }
  return (
    <Stack gap={3}>
      <form onSubmit={submit}>
        <Stack gap={3}>
          <TextInput
            label="Key name"
            value={name}
            // Cap at the server's 100-char limit the way the old native
            // maxLength did; TextInput cannot carry the attribute itself.
            onChange={value => { setName(value.slice(0, 100)); setNameError(null); }}
            isRequired
            placeholder="e.g. My CLI"
            isDisabled={pending}
            {...(nameError ? { status: { type: 'error' as const, message: nameError } } : {})}
          />
          <div>
            <Button label="Create Key" variant="primary" type="submit" isDisabled={pending || !name.trim()} isLoading={mutation.isPending} />
          </div>
        </Stack>
      </form>
      <ErrorNotice error={mutation.error} />
      {created && <NewKeyBanner name={created.name} rawKey={created.key} />}
    </Stack>
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
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Stack gap={2}>
            <Text type="label">Connect agents</Text>
            <Heading level={1}>API Keys</Heading>
            <Text type="body">Use a key with an MCP client or let an Agent call the REST API with curl. Each key can read and write only your own Contexts.</Text>
          </Stack>
          {auth.isPending && <LoadingList rows={2} />}
          {!auth.isPending && !auth.data?.user && <SignedOutNotice />}
          {auth.data?.user && (
            <>
              <KeyForm pending={false} />
              <ErrorNotice error={query.error} />
              <ErrorNotice error={revoke.error} />
              {query.isPending && <LoadingList rows={2} />}
              {keys && active.length === 0 && revoked.length === 0 && (
                <EmptyState title="No keys yet" description="Create an API key to let an Agent access your Contexts through curl or MCP." />
              )}
              <Stack gap={3}>
                {active.map(key => (
                  <Card key={key.id}>
                    <Stack direction="horizontal" gap={3} vAlign="center" justify="between">
                      <Stack gap={1}>
                        <Heading level={2}>{key.name}</Heading>
                        <Text type="supporting">Created {formatDateTime(key.createdAt)} · Last used {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'never'}</Text>
                      </Stack>
                      <Button label="Revoke" variant="ghost" size="sm" isLoading={revoke.isPending && revoke.variables === key.id} onClick={() => revoke.mutate(key.id)} />
                    </Stack>
                  </Card>
                ))}
                {revoked.map(key => (
                  <Card key={key.id} variant="muted">
                    <Stack gap={1}>
                      <Heading level={2}>{key.name}</Heading>
                      <Text type="supporting">Revoked on {formatDateTime(key.revokedAt!)} · requests with this key are rejected</Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      }
    />
  );
}
