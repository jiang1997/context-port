import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TemporaryContext } from '@contextport/contracts';
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
import { ApiError, apiRequest } from '../api/client';
import { copyTextToClipboard } from '../components/copy-context-id';
import { ErrorNotice, Skeleton } from '../components/feedback';
import { MarkdownContent } from '../components/markdown-content';
import { translate, useI18n, type AppLocale, type AppMessageKey } from '../i18n';
import { buildTemporaryContextShareUrl, readTemporaryContextPassphrase, temporaryContextHash } from '../lib/temporary-context-url';

type GeneratedTemporaryContext = TemporaryContext & { passphrase: string };

function resolveTemporaryContextApiBase(): string {
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

/**
 * Instructions copied for an agent to read + append one Temporary Context. The
 * prose follows `locale` (defaults to English, which the tests assert on); the
 * curl commands are language-neutral.
 */
export function buildTemporaryContextAgentInstructions(passphrase: string, apiBase: string, expiresAt?: string, locale: AppLocale = 'en'): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const readPayload = shellQuotedJson(JSON.stringify({ passphrase }));
  const appendPayload = shellQuotedJson(JSON.stringify({ passphrase, content: 'YOUR TEXT HERE' }));
  return [
    t('@app.agent.instructions.intro'),
    '',
    t('@app.agent.instructions.passphrase', { passphrase }),
    t('@app.agent.instructions.apiBase', { apiBase }),
    ...(expiresAt ? [t('@app.agent.instructions.expires', { expires: expiresAt })] : []),
    '',
    t('@app.agent.instructions.readHeading'),
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    t('@app.agent.instructions.appendHeading'),
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    t('@app.agent.instructions.notesHeading'),
    t('@app.agent.instructions.note1'),
    t('@app.agent.instructions.note2'),
    t('@app.agent.instructions.note3'),
  ].join('\n');
}

/** Leave the passphrase empty to let the agent generate one; otherwise use it verbatim. */
export function validateAgentGuidePassphrase(passphrase: string): AppMessageKey | null {
  if (passphrase.length > 0 && passphrase.length < 8) return '@app.temp.passphraseMin';
  if (passphrase.length > 128) return '@app.temp.passphraseMax';
  return null;
}

/** Localised guide for a supplied passphrase, or for an agent to generate one. */
export function buildTemporaryContextAgentGuide(apiBase: string, locale: AppLocale = 'en', passphrase = ''): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const credential = passphrase || 'YOUR PASSPHRASE';
  const readPayload = shellQuotedJson(JSON.stringify({ passphrase: credential }));
  const appendPayload = shellQuotedJson(JSON.stringify({ passphrase: credential, content: 'YOUR TEXT HERE' }));
  return [
    t('@app.agent.guide.intro'),
    '',
    t('@app.agent.guide.apiBase', { apiBase }),
    '',
    ...(passphrase ? [
      t('@app.agent.instructions.passphrase', { passphrase }),
      '',
      t('@app.agent.guide.openStep'),
      `curl -s -X POST "${apiBase}/temporary-contexts/open" -H "Content-Type: application/json" -d ${readPayload}`,
      t('@app.agent.guide.openResult'),
    ] : [
      t('@app.agent.guide.step1'),
      `curl -s -X POST "${apiBase}/temporary-contexts/generate"`,
      t('@app.agent.guide.step1Result'),
      t('@app.agent.guide.generatedNext'),
      '',
      t('@app.agent.guide.orOpen'),
      `curl -s -X POST "${apiBase}/temporary-contexts/open" -H "Content-Type: application/json" -d ${readPayload}`,
    ]),
    '',
    t('@app.agent.guide.step2'),
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    t('@app.agent.guide.step3'),
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    t('@app.agent.guide.rulesHeading'),
    t('@app.agent.guide.rule1'),
    t('@app.agent.guide.rule2'),
    t('@app.agent.guide.rule3'),
    t('@app.agent.guide.rule4'),
  ].join('\n');
}

// Backwards-compatible aliases
export const buildClipboardAgentInstructions = buildTemporaryContextAgentInstructions;
export const buildClipboardAgentGuide = buildTemporaryContextAgentGuide;

export function TemporaryContextPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const linkPassphrase = readTemporaryContextPassphrase(location.hash);
  const linkError = linkPassphrase === null ? null
    : linkPassphrase.length < 8 ? t('@app.temp.passphraseMin')
    : linkPassphrase.length > 128 ? t('@app.temp.passphraseMax') : null;
  const passphrase = linkError ? '' : linkPassphrase ?? '';
  const [entry, setEntry] = useState(passphrase);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [addition, setAddition] = useState('');
  const [additionError, setAdditionError] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ content: string; version: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedForAgent, setCopiedForAgent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkCopyFailed, setLinkCopyFailed] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [guidePassphrase, setGuidePassphrase] = useState(passphrase);
  const [guideError, setGuideError] = useState<AppMessageKey | null>(null);
  const [activeTab, setActiveTab] = useState<'agent' | 'human'>(linkPassphrase === null ? 'agent' : 'human');
  const shareUrl = passphrase ? buildTemporaryContextShareUrl(window.location.href, passphrase) : '';

  function setUrlPassphrase(value: string | null) {
    void navigate({ pathname: location.pathname, search: location.search, hash: temporaryContextHash(location.hash, value) });
  }
  useEffect(() => {
    if (!copiedGuide) return;
    const timer = window.setTimeout(() => setCopiedGuide(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedGuide]);

  function prefillGuide(value: string) {
    setGuidePassphrase(value);
    setGuideError(null);
    setCopiedGuide(false);
  }
  const read = useQuery({
    queryKey: ['temporary-context', passphrase],
    queryFn: () => apiRequest<TemporaryContext>('/temporary-contexts/read', { method: 'POST', body: JSON.stringify({ passphrase }) }),
    enabled: Boolean(passphrase),
    retry: false,
    refetchInterval: query => query.state.error instanceof ApiError && query.state.error.status === 404 ? false : 5000,
  });
  const open = useMutation({
    mutationFn: (value: string) => apiRequest<TemporaryContext>('/temporary-contexts/open', { method: 'POST', body: JSON.stringify({ passphrase: value }) }),
    onSuccess: (_data, value) => { setUrlPassphrase(value); },
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GeneratedTemporaryContext>('/temporary-contexts/generate', { method: 'POST' }),
    onSuccess: data => { setUrlPassphrase(data.passphrase); },
  });
  const append = useMutation({
    mutationFn: (content: string) => apiRequest<TemporaryContext>('/temporary-contexts/append', {
      method: 'POST', body: JSON.stringify({ passphrase, content }),
    }),
    onSuccess: async () => { setAddition(''); setAdditionError(null); await read.refetch(); },
  });
  const update = useMutation({
    mutationFn: (draft: { content: string; version: number }) => apiRequest<TemporaryContext>('/temporary-contexts/update', {
      method: 'POST', body: JSON.stringify({ passphrase, content: draft.content, expectedVersion: draft.version }),
    }),
    onSuccess: data => {
      queryClient.setQueryData(['temporary-context', passphrase], data);
      setEdit(null);
      void read.refetch();
    },
    onError: () => { void read.refetch(); },
  });
  const editConflict = (update.error instanceof ApiError && update.error.status === 409)
    || (edit !== null && read.data !== undefined && edit.version !== read.data.version);

  // The URL is the credential source for refreshes, shared links, and history navigation.
  useEffect(() => {
    if (linkPassphrase !== null) setActiveTab('human');
    setEntry(passphrase);
    setEntryError(null);
    prefillGuide(passphrase);
    setAddition('');
    setAdditionError(null);
    setEdit(null);
    open.reset();
    generate.reset();
    update.reset();
    append.reset();
    setCopied(false);
    setCopiedForAgent(false);
    setCopiedLink(false);
    setLinkCopyFailed(false);
  }, [location.hash]);

  useEffect(() => {
    if (!copiedLink) return;
    const timer = window.setTimeout(() => setCopiedLink(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedLink]);

  async function copyLink() {
    const ok = await copyTextToClipboard(shareUrl);
    setCopiedLink(ok);
    setLinkCopyFailed(!ok);
  }

  function startEditing() {
    if (!read.data) return;
    update.reset();
    setEdit({ content: read.data.content, version: read.data.version });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (edit && !editConflict && !update.isPending) update.mutate(edit);
  }
  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TextInput cannot carry the native minLength/maxLength constraints
    // (the Astryx component maps isRequired to aria-required only), so the
    // 8–128 char contract is enforced here with visible feedback instead
    // of silently ignoring the submit.
    if (entry.length < 8) {
      setEntryError(t('@app.temp.passphraseMin'));
      return;
    }
    if (entry.length > 128) {
      setEntryError(t('@app.temp.passphraseMax'));
      return;
    }
    setEntryError(null);
    open.mutate(entry);
  }
  function submitAddition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addition) {
      setAdditionError(t('@app.temp.addEmpty'));
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
    const instructions = buildTemporaryContextAgentInstructions(passphrase, resolveTemporaryContextApiBase(), read.data?.expiresAt, locale);
    const ok = await copyTextToClipboard(instructions);
    if (ok) setCopiedForAgent(true);
  }
  async function copyAgentGuide() {
    const error = validateAgentGuidePassphrase(guidePassphrase);
    setGuideError(error);
    setCopiedGuide(false);
    if (error) return;
    const ok = await copyTextToClipboard(buildTemporaryContextAgentGuide(resolveTemporaryContextApiBase(), locale, guidePassphrase));
    setCopiedGuide(ok);
    if (!ok) setGuideError('@app.temp.guideCopyFailed');
  }
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Stack gap={2}>
            <Heading level={1}>{t('@app.temp.title')}</Heading>
            <Text type="body">{t('@app.temp.intro')}</Text>
            <Text type="supporting">{t('@app.temp.retention')}</Text>
          </Stack>
          <TabList value={activeTab} onChange={val => setActiveTab(val as 'agent' | 'human')} hasDivider role="tablist">
            <Tab value="agent" label={t('@app.temp.tabAgents')} />
            <Tab value="human" label={t('@app.temp.tabHumans')} />
          </TabList>
          {activeTab === 'human' ? (
            !passphrase ? (
              <Card>
                <Stack gap={3}>
                  <Heading level={2}>{t('@app.temp.openHeading')}</Heading>
                  <form onSubmit={submitEntry}>
                    <Stack gap={3}>
                      <TextInput
                        label={t('@app.temp.passphrase')}
                        value={entry}
                        onChange={value => { setEntry(value); setEntryError(null); }}
                        isRequired
                        placeholder={t('@app.temp.passphrasePlaceholder')}
                        autoComplete="off"
                        {...(entryError || linkError ? { status: { type: 'error' as const, message: (entryError || linkError)! } } : {})}
                      />
                      <Stack direction="horizontal" gap={3} wrap="wrap">
                        <Button label={t('@app.temp.enter')} variant="primary" type="submit" isLoading={open.isPending} />
                        <Button label={t('@app.temp.generate')} variant="secondary" isLoading={generate.isPending} onClick={() => generate.mutate()} />
                      </Stack>
                    </Stack>
                  </form>
                  <Text type="supporting">{t('@app.temp.privacyNote')}</Text>
                  <ErrorNotice error={open.error ?? generate.error} />
                </Stack>
              </Card>
            ) : (
              <>
                <Card>
                  <Stack gap={3}>
                    <Heading level={2}>{t('@app.temp.shareHeading')}</Heading>
                    <Stack direction="horizontal" gap={2} vAlign="center" wrap="wrap">
                      <Text type="code">{passphrase}</Text>
                      <Button label={copied ? t('@app.temp.copiedPassphrase') : t('@app.temp.copyPassphrase')} variant="secondary" size="sm" onClick={() => void copyPassphrase()} tooltip={t('@app.temp.copyPassphraseTooltip')} />
                      <Button label={copiedForAgent ? t('@app.temp.copiedForAgent') : t('@app.temp.copyForAgent')} variant="secondary" size="sm" onClick={() => void copyForAgent()} tooltip={t('@app.temp.copyForAgentTooltip')} />
                    </Stack>
                    <TextInput label={t('@app.temp.shareLink')} value={shareUrl} isReadOnly />
                    <div>
                      <Button label={copiedLink ? t('@app.temp.copiedLink') : t('@app.temp.copyLink')} variant="primary" size="sm" onClick={() => void copyLink()} />
                    </div>
                    {linkCopyFailed && <Text type="supporting" role="alert">{t('@app.temp.copyLinkFailed')}</Text>}
                    <Text type="supporting">{t('@app.temp.keepSafe')}</Text>
                    <div>
                      <Button
                        label={t('@app.temp.leave')}
                        variant="ghost"
                        size="sm"
                        isDisabled={update.isPending || append.isPending}
                        onClick={() => setUrlPassphrase(null)}
                      />
                    </div>
                  </Stack>
                </Card>
                {read.error instanceof ApiError && read.error.status === 404 ? (
                  <Card>
                    <Stack gap={2}>
                      <Heading level={2}>{t('@app.temp.linkUnavailable')}</Heading>
                      <Text type="body">{t('@app.temp.linkUnavailableHint')}</Text>
                    </Stack>
                  </Card>
                ) : <ErrorNotice error={read.error} />}
                {read.error && <div><Button label={t('@app.temp.retryRead')} variant="secondary" isLoading={read.isFetching} onClick={() => void read.refetch()} /></div>}
                {read.isPending && <Skeleton lines={4} />}
                {read.data && !read.error && (
                  <>
                    <Text type="supporting">
                      {t('@app.temp.expires', {
                        date: new Date(read.data.expiresAt).toLocaleString(locale),
                        version: read.data.version,
                      })}
                    </Text>
                    <Card>
                      <Stack gap={2}>
                        <Heading level={2}>{t('@app.temp.sharedContent')}</Heading>
                        {edit ? (
                          <form onSubmit={submitEdit}>
                            <Stack gap={3}>
                              <TextArea
                                label={t('@app.temp.editContent')}
                                value={edit.content}
                                onChange={content => setEdit({ ...edit, content })}
                                isDisabled={update.isPending}
                                maxLength={100_000}
                                rows={14}
                              />
                              {editConflict && (
                                <Text type="supporting" role="alert">{t('@app.temp.editConflict')}</Text>
                              )}
                              <ErrorNotice error={update.error instanceof ApiError && update.error.status === 409 ? null : update.error} />
                              <Stack direction="horizontal" gap={3} wrap="wrap">
                                <Button label={t('@app.temp.saveChanges')} variant="primary" type="submit" isLoading={update.isPending} isDisabled={editConflict || update.isPending} />
                                <Button label={t('@app.temp.cancelEdit')} variant="secondary" isDisabled={update.isPending} onClick={() => { setEdit(null); update.reset(); }} />
                              </Stack>
                              {editConflict && <Heading level={3}>{t('@app.temp.latestContent')}</Heading>}
                            </Stack>
                          </form>
                        ) : (
                          <div>
                            <Button label={t('@app.temp.editContent')} variant="secondary" size="sm" isDisabled={append.isPending} onClick={startEditing} />
                          </div>
                        )}
                        {(!edit || editConflict) && (
                          <>
                            {read.data.content ? (
                              <MarkdownContent content={read.data.content} />
                            ) : (
                              <Text type="supporting">{t('@app.temp.noContent')}</Text>
                            )}
                          </>
                        )}
                      </Stack>
                    </Card>
                    {!edit && (
                      <Card>
                        <form onSubmit={submitAddition}>
                          <Stack gap={3}>
                            <TextArea
                              label={t('@app.temp.addToContext')}
                              value={addition}
                              onChange={value => { setAddition(value); setAdditionError(null); }}
                              isRequired
                              maxLength={20_000}
                              rows={7}
                              {...(additionError ? { status: { type: 'error' as const, message: additionError } } : {})}
                            />
                            <ErrorNotice error={append.error} />
                            <div>
                              <Button label={append.isPending ? t('@app.temp.adding') : t('@app.temp.addContent')} variant="primary" type="submit" isLoading={append.isPending} />
                            </div>
                          </Stack>
                        </form>
                      </Card>
                    )}
                  </>
                )}
              </>
            )
          ) : (
            <Stack gap={4}>
              <Card>
                <Stack gap={3}>
                  <Heading level={2}>{t('@app.temp.guideHeading')}</Heading>
                  <Text type="supporting">{t('@app.temp.guideIntro')}</Text>
                  <List listStyle="decimal">
                    <ListItem label={<Text type="body">{t('@app.temp.guideGenerate')} <Code>POST /temporary-contexts/generate</Code></Text>} />
                    <ListItem label={<Text type="body">{t('@app.temp.guideOpen')} <Code>POST /temporary-contexts/open</Code></Text>} />
                    <ListItem label={<Text type="body">{t('@app.temp.guideRead')} <Code>POST /temporary-contexts/read</Code></Text>} />
                    <ListItem label={<Text type="body">{t('@app.temp.guideAppend')} <Code>POST /temporary-contexts/append</Code></Text>} />
                  </List>
                  <form onSubmit={event => { event.preventDefault(); void copyAgentGuide(); }}>
                    <Stack gap={3}>
                      <TextInput
                        label={t('@app.temp.passphrase')}
                        isOptional
                        value={guidePassphrase}
                        onChange={value => { setGuidePassphrase(value); setGuideError(null); setCopiedGuide(false); }}
                        placeholder={t('@app.temp.guidePassphrasePlaceholder')}
                        description={t('@app.temp.guidePassphraseLengthHint')}
                        autoComplete="off"
                        {...(guideError ? { status: { type: 'error' as const, message: t(guideError) } } : {})}
                      />
                      {copiedGuide && (
                        <Text type="supporting" aria-live="polite">
                          {t('@app.temp.guideCopiedHint')}
                        </Text>
                      )}
                      <div>
                        <Button label={copiedGuide ? t('@app.temp.copiedGuide') : t('@app.temp.copyGuide')} variant="primary" type="submit" />
                      </div>
                    </Stack>
                  </form>
                </Stack>
              </Card>
            </Stack>
          )}
        </Stack>
      }
    />
  );
}

// Backwards-compatible alias
export { TemporaryContextPage as ClipboardPage };
