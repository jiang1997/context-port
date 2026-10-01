import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Clipboard } from '@contextport/contracts';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Layout } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
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
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    'Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    'Notes for agent:',
    '- No login needed, the passphrase is the credential. Keep it secret.',
    '- `read` returns JSON { content, version, expiresAt }.',
    '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
  ].join('\n');
}

export function buildClipboardAgentGuide(apiBase: string): string {
  return [
    'Temporary Context lets any person or agent share short-lived text without login. It expires 7 days after creation.',
    '',
    `API base: ${apiBase}`,
    '',
    '1. Create a new Context (server generates a random passphrase):',
    `curl -s -X POST "${apiBase}/temporary-contexts/generate"`,
    '→ returns JSON { passphrase, content, version, expiresAt }. Save the passphrase — it is the only credential.',
    '',
    'Or create / enter with your own passphrase (8-128 characters):',
    `curl -s -X POST "${apiBase}/temporary-contexts/open" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE"}'`,
    '',
    '2. Read the current content:',
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE"}'`,
    '',
    '3. Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d '{"passphrase":"YOUR PASSPHRASE","content":"YOUR TEXT HERE"}'`,
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
  const [entryError, setEntryError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [addition, setAddition] = useState('');
  const [additionError, setAdditionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedForAgent, setCopiedForAgent] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'agent' | 'human'>('agent');
  const read = useQuery({
    queryKey: ['temporary-context', passphrase],
    queryFn: () => apiRequest<Clipboard>('/temporary-contexts/read', { method: 'POST', body: JSON.stringify({ passphrase }) }),
    enabled: Boolean(passphrase),
    refetchInterval: 5000,
  });
  const open = useMutation({
    mutationFn: (value: string) => apiRequest<Clipboard>('/temporary-contexts/open', { method: 'POST', body: JSON.stringify({ passphrase: value }) }),
    onSuccess: (_data, value) => { setPassphrase(value); setCopied(false); setCopiedForAgent(false); },
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GeneratedClipboard>('/temporary-contexts/generate', { method: 'POST' }),
    onSuccess: data => { setEntry(data.passphrase); setEntryError(null); setPassphrase(data.passphrase); setCopied(false); setCopiedForAgent(false); },
  });
  const append = useMutation({
    mutationFn: (content: string) => apiRequest<Clipboard>('/temporary-contexts/append', {
      method: 'POST', body: JSON.stringify({ passphrase, content }),
    }),
    onSuccess: async () => { setAddition(''); setAdditionError(null); await read.refetch(); },
  });
  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TextInput cannot carry the native minLength/maxLength constraints
    // (the Astryx component maps isRequired to aria-required only), so the
    // 8–128 char contract is enforced here with visible feedback instead
    // of silently ignoring the submit.
    if (entry.length < 8) {
      setEntryError('Passphrase must be at least 8 characters.');
      return;
    }
    if (entry.length > 128) {
      setEntryError('Passphrase must be at most 128 characters.');
      return;
    }
    setEntryError(null);
    open.mutate(entry);
  }
  function submitAddition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addition) {
      setAdditionError('Add some text before submitting.');
      return;
    }
    setAdditionError(null);
    append.mutate(addition);
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
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Stack gap={2}>
            <Heading level={1}>Temporary Context</Heading>
            <Text type="body">A temporary, login-free workspace to share task context with people or AI agents. Automatically expires in 7 days.</Text>
          </Stack>
          <TabList value={activeTab} onChange={val => setActiveTab(val as 'agent' | 'human')} hasDivider role="tablist">
            <Tab value="agent" label="For Agents" />
            <Tab value="human" label="For Humans" />
          </TabList>

          {activeTab === 'human' ? (
            !passphrase ? (
              <Card>
                <Stack gap={3}>
                  <Heading level={2}>Open or Create a Context</Heading>
                  <form onSubmit={submitEntry}>
                    <Stack gap={3}>
                      <TextInput
                        label="Passphrase"
                        value={entry}
                        onChange={value => { setEntry(value); setEntryError(null); }}
                        isRequired
                        placeholder="At least 8 characters"
                        autoComplete="off"
                        {...(entryError ? { status: { type: 'error' as const, message: entryError } } : {})}
                      />
                      <Stack direction="horizontal" gap={3} wrap="wrap">
                        <Button label="Enter with passphrase" variant="primary" type="submit" isLoading={open.isPending} />
                        <Button label="Generate random passphrase" variant="secondary" isLoading={generate.isPending} onClick={() => generate.mutate()} />
                      </Stack>
                    </Stack>
                  </form>
                  <Text type="supporting">Anyone with this passphrase can read and edit. For sensitive content, use &quot;Generate random passphrase&quot; to ensure privacy.</Text>
                  <ErrorNotice error={open.error ?? generate.error} />
                </Stack>
              </Card>
            ) : (
              <>
                <Card>
                  <Stack gap={3}>
                    <Heading level={2}>Share this passphrase</Heading>
                    <Stack direction="horizontal" gap={2} vAlign="center" wrap="wrap">
                      <Text type="code">{passphrase}</Text>
                      <Button label={copied ? 'Copied' : 'Copy'} variant="secondary" size="sm" onClick={() => void copyPassphrase()} />
                      <Button label={copiedForAgent ? 'Copied for agent' : 'Copy for agent'} variant="secondary" size="sm" onClick={() => void copyForAgent()} tooltip="Copy curl instructions for read + append" />
                    </Stack>
                    <Text type="supporting">The passphrase is your only way back. Keep it somewhere safe until this Context expires.</Text>
                    <div>
                      <Button
                        label="Leave Context"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPassphrase(''); setEntry(''); setAddition(''); setCopied(false); setCopiedForAgent(false); }}
                      />
                    </div>
                  </Stack>
                </Card>
                <ErrorNotice error={read.error} />
                {read.isPending && <Skeleton lines={4} />}
                {read.data && !read.error && (
                  <>
                    <Text type="supporting">Expires {new Date(read.data.expiresAt).toLocaleString()} · version {read.data.version}</Text>
                    <Card>
                      <Stack gap={2}>
                        <Heading level={2}>Shared content</Heading>
                        {read.data.content ? (
                          <MarkdownContent content={read.data.content} />
                        ) : (
                          <Text type="supporting">No content yet. Add the first update below or let your agent append to it.</Text>
                        )}
                      </Stack>
                    </Card>
                    <Card>
                      <form onSubmit={submitAddition}>
                        <Stack gap={3}>
                          <TextArea
                            label="Add to Context"
                            value={addition}
                            onChange={value => { setAddition(value); setAdditionError(null); }}
                            isRequired
                            maxLength={20_000}
                            rows={7}
                            {...(additionError ? { status: { type: 'error' as const, message: additionError } } : {})}
                          />
                          <ErrorNotice error={append.error} />
                          <div>
                            <Button label={append.isPending ? 'Adding…' : 'Add content'} variant="primary" type="submit" isLoading={append.isPending} />
                          </div>
                        </Stack>
                      </form>
                    </Card>
                  </>
                )}
              </>
            )
          ) : (
            <Stack gap={4}>
              {passphrase ? (
                <Card>
                  <Stack gap={3}>
                    <Heading level={2}>Instructions for this Context</Heading>
                    <Text type="supporting">
                      Your active passphrase is <Code>{passphrase}</Code>. Give these instructions to your agent so it can read and update this specific Context.
                    </Text>
                    <Stack direction="horizontal" gap={2} vAlign="center" wrap="wrap">
                      <Button
                        label={copiedForAgent ? 'Copied instructions' : 'Copy agent instructions'}
                        variant="primary"
                        size="sm"
                        onClick={() => void copyForAgent()}
                      />
                      <Button
                        label={copied ? 'Copied passphrase' : 'Copy passphrase'}
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyPassphrase()}
                      />
                    </Stack>
                  </Stack>
                </Card>
              ) : null}
              <Card>
                <Stack gap={3}>
                  <Heading level={2}>Agent API Guide</Heading>
                  <Text type="supporting">
                    No login needed — copy the guide and paste it to your agent so it can create or join temporary workspaces via curl.
                  </Text>
                  <List listStyle="decimal">
                    <ListItem label={<Text type="body">Generate: <Code>POST /temporary-contexts/generate</Code></Text>} />
                    <ListItem label={<Text type="body">Open: <Code>POST /temporary-contexts/open</Code></Text>} />
                    <ListItem label={<Text type="body">Read: <Code>POST /temporary-contexts/read</Code></Text>} />
                    <ListItem label={<Text type="body">Append: <Code>POST /temporary-contexts/append</Code></Text>} />
                  </List>
                  <div>
                    <Button label={copiedGuide ? 'Copied' : 'Copy agent guide'} variant="secondary" size="sm" onClick={() => void copyAgentGuide()} />
                  </div>
                </Stack>
              </Card>
            </Stack>
          )}
        </Stack>
      }
    />
  );
}
