import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import type { TemporaryContext } from '@contextport/contracts';
import { Button } from '@astryxdesign/core/Button';
import { Code } from '@astryxdesign/core/Code';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
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

const temporaryContextKey = (passphrase: string) => ['temporary-context', passphrase] as const;

function passphraseError(passphrase: string): AppMessageKey | null {
  return passphrase ? validateAgentGuidePassphrase(passphrase) : '@app.temp.passphraseMin';
}

function requestContext(action: 'open' | 'read', passphrase: string, signal?: AbortSignal) {
  return apiRequest<TemporaryContext>(`/temporary-contexts/${action}`, {
    method: 'POST',
    credentials: 'omit',
    body: JSON.stringify({ passphrase }),
    signal: signal ?? null,
  });
}

function isMissingContext(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

export function TemporaryContextPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const passphrase = readTemporaryContextPassphrase(location.hash);
  const linkError = passphrase === null ? null : passphraseError(passphrase);

  function setUrlPassphrase(value: string | null) {
    void navigate({
      pathname: location.pathname,
      search: location.search,
      hash: temporaryContextHash(location.hash, value),
    });
  }

  return passphrase !== null && !linkError
    ? <TemporaryContextWorkspace key={passphrase} passphrase={passphrase} onLeave={() => setUrlPassphrase(null)} />
    : <TemporaryContextLaunch key={passphrase ?? 'launch'} invalidLinkError={linkError} onOpen={setUrlPassphrase} />;
}

function TemporaryContextLaunch({ invalidLinkError, onOpen }: {
  invalidLinkError: AppMessageKey | null;
  onOpen: (passphrase: string) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState('');
  const [entryError, setEntryError] = useState(invalidLinkError);
  const [canCreate, setCanCreate] = useState(false);
  const entryRequest = useMutation({
    mutationFn: ({ action, passphrase }: { action: 'open' | 'read'; passphrase: string }) => requestContext(action, passphrase),
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GeneratedTemporaryContext>('/temporary-contexts/generate', {
      method: 'POST', credentials: 'omit',
    }),
  });
  const isPending = entryRequest.isPending || generate.isPending;
  const missingEntry = entryRequest.variables?.action === 'read' && isMissingContext(entryRequest.error);

  function openWorkspace(passphrase: string, data: TemporaryContext) {
    queryClient.setQueryData(temporaryContextKey(passphrase), data);
    onOpen(passphrase);
  }

  function submitEntry(action: 'open' | 'read') {
    if (isPending) return;
    const error = passphraseError(entry);
    setEntryError(error);
    if (error) return;
    generate.reset();
    if (action === 'read') setCanCreate(false);
    entryRequest.mutate({ action, passphrase: entry }, {
      onSuccess: (data, { passphrase }) => openWorkspace(passphrase, data),
      onError: error => {
        if (action === 'read' && isMissingContext(error)) setCanCreate(true);
      },
    });
  }

  function generateContext() {
    if (isPending) return;
    entryRequest.reset();
    setCanCreate(false);
    generate.mutate(undefined, {
      onSuccess: data => openWorkspace(data.passphrase, data),
    });
  }

  return (
    <div className="temporary-launch">
      <header className="temporary-launch-intro">
        <Heading level={1}>{t('@app.temp.hero')}</Heading>
        <Text type="body">{t('@app.temp.intro')}</Text>
        <Text type="supporting">{t('@app.temp.retention')}</Text>
      </header>
      <div className="temporary-launch-options">
        <section className="temporary-launch-option temporary-launch-create">
          <Stack gap={3}>
            <Heading level={2}>{t('@app.temp.createHeading')}</Heading>
            <Text type="supporting">{t('@app.temp.createHint')}</Text>
            <div>
              <Button label={t('@app.temp.generate')} variant="primary" isLoading={generate.isPending} isDisabled={isPending} onClick={generateContext} />
            </div>
            <ErrorNotice error={generate.error} />
          </Stack>
        </section>
        <section className="temporary-launch-option">
          <Stack gap={3}>
            <Heading level={2}>{t('@app.temp.joinHeading')}</Heading>
            <form onSubmit={event => { event.preventDefault(); submitEntry('read'); }}>
              <div className="temporary-launch-entry">
                <TextInput
                  label={t('@app.temp.passphrase')}
                  value={entry}
                  onChange={value => {
                    setEntry(value);
                    setEntryError(null);
                    setCanCreate(false);
                    entryRequest.reset();
                  }}
                  isDisabled={isPending}
                  isRequired
                  placeholder={t('@app.temp.passphrasePlaceholder')}
                  autoComplete="off"
                  {...(entryError ? { status: { type: 'error' as const, message: t(entryError) } } : {})}
                />
                <Button label={t('@app.temp.enter')} variant="secondary" type="submit" isLoading={entryRequest.isPending && entryRequest.variables.action === 'read'} isDisabled={isPending} />
              </div>
            </form>
            {missingEntry && <Text type="supporting" role="alert">{t('@app.temp.entryUnavailable')}</Text>}
            {canCreate && (
              <div>
                <Button label={t('@app.temp.createWithPassphrase')} variant="secondary" isLoading={entryRequest.isPending} isDisabled={isPending} onClick={() => submitEntry('open')} />
              </div>
            )}
            {!missingEntry && <ErrorNotice error={entryRequest.error} />}
          </Stack>
        </section>
      </div>
      <AgentQuickStart />
    </div>
  );
}

function AgentQuickStart() {
  const { t, locale } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<AppMessageKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateAgentGuidePassphrase(passphrase);
    setError(validationError);
    setCopied(false);
    if (validationError) return;
    const ok = await copyTextToClipboard(buildTemporaryContextAgentGuide(resolveTemporaryContextApiBase(), locale, passphrase));
    setCopied(ok);
    if (!ok) setError('@app.temp.guideCopyFailed');
  }

  return (
    <details className="temporary-guide">
      <summary>{t('@app.temp.guideHeading')}</summary>
      <Stack gap={3}>
        <Text type="supporting">{t('@app.temp.guideIntro')}</Text>
        <form onSubmit={event => void copyGuide(event)}>
          <Stack gap={3}>
            <TextInput
              label={t('@app.temp.passphrase')}
              isOptional
              value={passphrase}
              onChange={value => { setPassphrase(value); setError(null); setCopied(false); }}
              placeholder={t('@app.temp.guidePassphrasePlaceholder')}
              description={t('@app.temp.guidePassphraseLengthHint')}
              autoComplete="off"
              {...(error ? { status: { type: 'error' as const, message: t(error) } } : {})}
            />
            {copied && <Text type="supporting" role="status">{t('@app.temp.guideCopiedHint')}</Text>}
            <div>
              <Button label={copied ? t('@app.temp.copiedGuide') : t('@app.temp.copyGuide')} variant="primary" type="submit" />
            </div>
          </Stack>
        </form>
        <List listStyle="decimal">
          <ListItem label={<Text type="body">{t('@app.temp.guideGenerate')} <Code>POST /temporary-contexts/generate</Code></Text>} />
          <ListItem label={<Text type="body">{t('@app.temp.guideOpen')} <Code>POST /temporary-contexts/open</Code></Text>} />
          <ListItem label={<Text type="body">{t('@app.temp.guideRead')} <Code>POST /temporary-contexts/read</Code></Text>} />
          <ListItem label={<Text type="body">{t('@app.temp.guideAppend')} <Code>POST /temporary-contexts/append</Code></Text>} />
        </List>
      </Stack>
    </details>
  );
}

function TemporaryContextWorkspace({ passphrase, onLeave }: { passphrase: string; onLeave: () => void }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [addition, setAddition] = useState('');
  const [additionError, setAdditionError] = useState(false);
  const [edit, setEdit] = useState<{ content: string; originalContent: string; version: number; merging?: boolean } | null>(null);
  const queryKey = temporaryContextKey(passphrase);
  const read = useQuery({
    queryKey,
    queryFn: ({ signal }) => requestContext('read', passphrase, signal),
    retry: false,
    refetchInterval: query => isMissingContext(query.state.error) ? false : 5000,
  });

  async function cacheWrite(data: TemporaryContext) {
    // Abort any in-flight read so it cannot restore content from before the write.
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TemporaryContext>(queryKey, current =>
      current && current.version > data.version ? current : data);
  }

  const append = useMutation({
    mutationFn: (content: string) => apiRequest<TemporaryContext>('/temporary-contexts/append', {
      method: 'POST', credentials: 'omit', body: JSON.stringify({ passphrase, content }),
    }),
    onSuccess: async data => {
      await cacheWrite(data);
      setAddition('');
    },
  });
  const update = useMutation({
    mutationFn: (draft: { content: string; version: number }) => apiRequest<TemporaryContext>('/temporary-contexts/update', {
      method: 'POST', credentials: 'omit',
      body: JSON.stringify({ passphrase, content: draft.content, expectedVersion: draft.version }),
    }),
    onSuccess: async data => {
      await cacheWrite(data);
      setEdit(null);
    },
    onError: () => { void read.refetch(); },
  });
  const saving = update.isPending || append.isPending;
  const hasDraft = Boolean(addition) || (edit !== null && edit.content !== edit.originalContent);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    (hasDraft || saving) && (
      currentLocation.pathname !== nextLocation.pathname ||
      readTemporaryContextPassphrase(nextLocation.hash) !== passphrase
    ));
  const handledNavigation = useRef<typeof blocker>(null);

  useEffect(() => {
    if (blocker.state !== 'blocked' || handledNavigation.current === blocker) return;
    // Router transitions can leave this blocker visible for another render.
    handledNavigation.current = blocker;
    if (!saving && (!hasDraft || window.confirm(t('@app.temp.confirmSwitch')))) {
      setAddition('');
      setAdditionError(false);
      setEdit(null);
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, hasDraft, saving, t]);

  useEffect(() => {
    if (!hasDraft && !saving) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasDraft, saving]);

  const data = read.data;
  const unavailable = isMissingContext(read.error);
  const versionConflict = update.error instanceof ApiError && update.error.status === 409;
  const editConflict = versionConflict || (edit !== null && data !== undefined && edit.version !== data.version);
  const canUseLatest = edit !== null && data !== undefined && data.version > edit.version;
  const showLatest = editConflict || edit?.merging;

  function startEditing() {
    if (!data || unavailable || saving) return;
    update.reset();
    setEdit({ content: data.content, originalContent: data.content, version: data.version });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (edit && !editConflict && !saving && !unavailable) update.mutate(edit);
  }

  function useLatestVersion() {
    if (!edit || !data || !canUseLatest || saving || unavailable) return;
    update.reset();
    setEdit({ ...edit, originalContent: data.content, version: data.version, merging: true });
  }

  function submitAddition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || unavailable) return;
    if (!addition) {
      setAdditionError(true);
      return;
    }
    append.mutate(addition);
  }

  return (
    <div className="temporary-workspace">
      <header className="temporary-workspace-header">
        <div className="temporary-workspace-context">
          <Button label={t('@app.temp.leave')} variant="ghost" size="sm" isDisabled={saving} onClick={onLeave} />
          <div className="temporary-workspace-passphrase">
            <Text type="supporting">{t('@app.temp.currentPassphrase')}</Text>
            <Code>{passphrase}</Code>
          </div>
        </div>
        {data && !unavailable && (
          <>
            <Text type="supporting">
              {t('@app.temp.expires', {
                date: new Date(data.expiresAt).toLocaleString(locale),
                version: data.version,
              })}
            </Text>
            <TemporaryContextShare passphrase={passphrase} expiresAt={data.expiresAt} />
          </>
        )}
      </header>
      {read.isPending && <Skeleton lines={4} heading />}
      {read.error && (
        <Stack gap={2}>
          {unavailable ? (
            <>
              <Heading level={data && hasDraft ? 2 : 1}>{t('@app.temp.linkUnavailable')}</Heading>
              <Text type="body">{t('@app.temp.linkUnavailableHint')}</Text>
            </>
          ) : <ErrorNotice error={read.error} />}
          <div><Button label={t('@app.temp.retryRead')} variant="secondary" isLoading={read.isFetching} onClick={() => void read.refetch()} /></div>
        </Stack>
      )}
      {data && (!unavailable || hasDraft) && (
        <article className="temporary-document">
          <div className="temporary-document-heading">
            <Heading level={1}>{t('@app.temp.sharedContent')}</Heading>
            {!edit && !unavailable && (
              <Button label={t('@app.temp.editContent')} variant={data.content.trim() ? 'secondary' : 'primary'} size="sm" isDisabled={saving} onClick={startEditing} />
            )}
          </div>
          {edit && (
            <form onSubmit={submitEdit}>
              <Stack gap={3}>
                <TextArea
                  label={t('@app.temp.editContent')}
                  value={edit.content}
                  onChange={content => setEdit({ ...edit, content })}
                  isDisabled={saving}
                  maxLength={100_000}
                  rows={14}
                />
                {editConflict && <Text type="supporting" role="alert">{t('@app.temp.editConflict')}</Text>}
                {edit?.merging && !editConflict && <Text type="supporting">{t('@app.temp.mergeDraft')}</Text>}
                <ErrorNotice error={versionConflict ? null : update.error} />
                <Stack direction="horizontal" gap={3} wrap="wrap">
                  <Button label={t('@app.temp.saveChanges')} variant="primary" type="submit" isLoading={update.isPending} isDisabled={editConflict || saving || unavailable} />
                  {editConflict && !unavailable && (canUseLatest
                    ? <Button label={t('@app.temp.useLatestVersion')} variant="secondary" isDisabled={saving} onClick={useLatestVersion} />
                    : <Button label={t('@app.temp.refreshLatest')} variant="secondary" isLoading={read.isFetching} isDisabled={saving} onClick={() => void read.refetch()} />)}
                  <Button label={t('@app.temp.cancelEdit')} variant="secondary" isDisabled={saving} onClick={() => { setEdit(null); update.reset(); }} />
                </Stack>
                {showLatest && <Heading level={2}>{t('@app.temp.latestContent')}</Heading>}
              </Stack>
            </form>
          )}
          {(!edit || showLatest) && (
            <div className="temporary-document-body">
              {data.content.trim()
                ? <MarkdownContent content={data.content} />
                : <Text type="supporting">{t('@app.temp.noContent')}</Text>}
            </div>
          )}
          {!edit && (
            <form className="temporary-document-append" onSubmit={submitAddition}>
              <Stack gap={3}>
                <TextArea
                  label={t('@app.temp.addToContext')}
                  value={addition}
                  isDisabled={saving}
                  onChange={value => { setAddition(value); setAdditionError(false); }}
                  isRequired
                  maxLength={20_000}
                  rows={7}
                  {...(additionError ? { status: { type: 'error' as const, message: t('@app.temp.addEmpty') } } : {})}
                />
                <ErrorNotice error={append.error} />
                <div>
                  <Button label={append.isPending ? t('@app.temp.adding') : t('@app.temp.addContent')} variant="primary" type="submit" isLoading={append.isPending} isDisabled={saving || unavailable} />
                </div>
              </Stack>
            </form>
          )}
        </article>
      )}
    </div>
  );
}

function TemporaryContextShare({ passphrase, expiresAt }: { passphrase: string; expiresAt: string }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState<'passphrase' | 'agent' | 'link' | null>(null);
  const [linkCopyFailed, setLinkCopyFailed] = useState(false);
  const shareUrl = buildTemporaryContextShareUrl(window.location.href, passphrase);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(kind: NonNullable<typeof copied>, value: string) {
    const ok = await copyTextToClipboard(value);
    setCopied(ok ? kind : null);
    if (kind === 'link') setLinkCopyFailed(!ok);
  }

  function copyForAgent() {
    const prompt = buildTemporaryContextAgentInstructions(passphrase, resolveTemporaryContextApiBase(), expiresAt, locale);
    void copy('agent', prompt);
  }

  return (
    <>
      <div className="temporary-share-actions" role="group" aria-label={t('@app.temp.shareHeading')}>
        <Button label={copied === 'agent' ? t('@app.temp.copiedForAgent') : t('@app.temp.copyForAgent')} variant="secondary" size="sm" onClick={copyForAgent} tooltip={t('@app.temp.copyForAgentTooltip')} />
        <Button label={copied === 'link' ? t('@app.temp.copiedLink') : t('@app.temp.copyLink')} variant="secondary" size="sm" onClick={() => void copy('link', shareUrl)} tooltip={t('@app.temp.keepSafe')} />
        <Button label={copied === 'passphrase' ? t('@app.temp.copiedPassphrase') : t('@app.temp.copyPassphrase')} variant="ghost" size="sm" onClick={() => void copy('passphrase', passphrase)} tooltip={t('@app.temp.copyPassphraseTooltip')} />
      </div>
      {linkCopyFailed && (
        <Stack gap={2}>
          <Text type="supporting" role="alert">{t('@app.temp.copyLinkFailed')}</Text>
          <TextInput label={t('@app.temp.shareLink')} value={shareUrl} isReadOnly />
        </Stack>
      )}
    </>
  );
}

// Backwards-compatible alias
export { TemporaryContextPage as ClipboardPage };
