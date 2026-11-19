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
import { useAuthSession } from '../components/auth-status';
import { copyTextToClipboard } from '../components/copy-context-id';
import { ErrorNotice, Skeleton } from '../components/feedback';
import { MarkdownContent } from '../components/markdown-content';
import { TemporaryContextExpiry } from '../components/temporary-context-expiry';
import { TemporaryContextShare } from '../components/temporary-context-share';
import { useI18n, type AppMessageKey } from '../i18n';
import { buildTemporaryContextAgentGuide, resolveTemporaryContextApiBase, validateAgentGuidePassphrase } from '../lib/temporary-context-agent';
import { readTemporaryContextPassphrase, temporaryContextHash } from '../lib/temporary-context-url';

export {
  buildClipboardAgentGuide,
  buildClipboardAgentInstructions,
  buildTemporaryContextAgentGuide,
  buildTemporaryContextAgentInstructions,
  validateAgentGuidePassphrase,
} from '../lib/temporary-context-agent';

type GeneratedTemporaryContext = TemporaryContext & { passphrase: string };

const temporaryContextKey = (passphrase: string) => ['temporary-context', passphrase] as const;

function passphraseError(passphrase: string): AppMessageKey | null {
  return passphrase ? validateAgentGuidePassphrase(passphrase) : '@app.temp.passphraseMin';
}

function requestContext(action: 'open' | 'read', passphrase: string, signal?: AbortSignal) {
  return apiRequest<TemporaryContext>(`/temporary-contexts/${action}`, {
    method: 'POST',
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
    mutationFn: () => apiRequest<GeneratedTemporaryContext>('/temporary-contexts/generate', { method: 'POST' }),
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
      <TemporaryContextAccountHint />
    </div>
  );
}

function TemporaryContextAccountHint() {
  const { t } = useI18n();
  const { data, isError } = useAuthSession({ poll: false });
  if (!data?.user || isError) return null;

  return (
    <aside className="temporary-account-hint">
      <Text type="supporting">{t('@app.temp.accountHint')}</Text>
      <Button href="/contexts" label={t('@app.temp.accountContexts')} variant="ghost" size="sm" />
    </aside>
  );
}

function AgentQuickStart() {
  const { t, locale } = useI18n();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<AppMessageKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);

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
    setManualPrompt(null);
    if (validationError) return;
    const prompt = buildTemporaryContextAgentGuide(resolveTemporaryContextApiBase(), locale, passphrase);
    const ok = await copyTextToClipboard(prompt);
    setCopied(ok);
    if (!ok) setManualPrompt(prompt);
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
              onChange={value => { setPassphrase(value); setError(null); setCopied(false); setManualPrompt(null); }}
              placeholder={t('@app.temp.guidePassphrasePlaceholder')}
              description={t('@app.temp.guidePassphraseLengthHint')}
              autoComplete="off"
              {...(error ? { status: { type: 'error' as const, message: t(error) } } : {})}
            />
            {copied && <Text type="supporting" role="status">{t('@app.temp.guideCopiedHint')}</Text>}
            <div>
              <Button label={copied ? t('@app.temp.copiedGuide') : t('@app.temp.copyGuide')} variant="primary" type="submit" />
            </div>
            {manualPrompt && (
              <>
                <Text type="supporting" role="alert">{t('@app.temp.copyManual')}</Text>
                <label className="temporary-share-field">
                  {t('@app.temp.setupPrompt')}
                  <textarea rows={8} value={manualPrompt} readOnly onFocus={event => event.currentTarget.select()} />
                </label>
              </>
            )}
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [addition, setAddition] = useState('');
  const [additionError, setAdditionError] = useState(false);
  const [edit, setEdit] = useState<{ content: string; originalContent: string; version: number } | null>(null);
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
    queryClient.setQueryData<TemporaryContext>(queryKey, current => {
      if (!current || current.version < data.version) return data;
      if (current.version === data.version && Date.parse(current.expiresAt) <= Date.parse(data.expiresAt)) return data;
      return current;
    });
  }

  const append = useMutation({
    mutationFn: (content: string) => apiRequest<TemporaryContext>('/temporary-contexts/append', {
      method: 'POST', body: JSON.stringify({ passphrase, content }),
    }),
    onSuccess: async data => {
      await cacheWrite(data);
      setAddition('');
    },
  });
  const update = useMutation({
    mutationFn: (draft: { content: string; version: number }) => apiRequest<TemporaryContext>('/temporary-contexts/update', {
      method: 'POST', body: JSON.stringify({ passphrase, content: draft.content, expectedVersion: draft.version }),
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

  function startEditing() {
    if (!data || unavailable || saving) return;
    update.reset();
    setEdit({ content: data.content, originalContent: data.content, version: data.version });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (edit && !editConflict && !saving && !unavailable) update.mutate(edit);
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
          <div className="temporary-workspace-identity">
            <Button label={t('@app.temp.leave')} variant="ghost" size="sm" isDisabled={saving} onClick={onLeave} />
            {data && !unavailable && (
              <div className="temporary-workspace-passphrase">
                <Text type="supporting">{t('@app.temp.currentPassphrase')}</Text>
                <code>{passphrase}</code>
              </div>
            )}
          </div>
          {data && !unavailable && <TemporaryContextExpiry expiresAt={data.expiresAt} version={data.version} />}
        </div>
        {data && !unavailable && <TemporaryContextShare passphrase={passphrase} expiresAt={data.expiresAt} />}
        <TemporaryContextAccountHint />
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
                <ErrorNotice error={versionConflict ? null : update.error} />
                <Stack direction="horizontal" gap={3} wrap="wrap">
                  <Button label={t('@app.temp.saveChanges')} variant="primary" type="submit" isLoading={update.isPending} isDisabled={editConflict || saving || unavailable} />
                  <Button label={t('@app.temp.cancelEdit')} variant="secondary" isDisabled={saving} onClick={() => { setEdit(null); update.reset(); }} />
                </Stack>
                {editConflict && <Heading level={2}>{t('@app.temp.latestContent')}</Heading>}
              </Stack>
            </form>
          )}
          {(!edit || editConflict) && (
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

// Backwards-compatible alias
export { TemporaryContextPage as ClipboardPage };
