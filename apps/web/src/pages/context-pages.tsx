import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContextDetail, ContextSummary, CreateContextInput, Thread } from '@contextport/contracts';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Layout } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { apiRequest } from '../api/client';
import { useAuthSession } from '../components/auth-status';
import { CopyContextIdButton } from '../components/copy-context-id';
import { MarkdownContent } from '../components/markdown-content';
import { RelativeTime } from '../components/relative-time';
import { ErrorNotice, LoadingList, SignedOutNotice, Skeleton } from '../components/feedback';
import { useI18n } from '../i18n';

function DocumentForm({ onSave, pending, error, label }: {
  onSave: (data: { title: string; content: string; createdByType: 'human' }) => void;
  pending: boolean; error: Error | null; label: string;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    // A title of spaces alone fails the server contract; surface it instead
    // of silently ignoring the submit (TextInput cannot carry the old native
    // pattern/required constraints).
    if (!trimmed) {
      setTitleError(t('@app.form.titleInvalid'));
      return;
    }
    setTitleError(null);
    onSave({ title: trimmed, content, createdByType: 'human' });
  }
  return (
    <form onSubmit={submit}>
      <Stack gap={4}>
        <TextInput
          label={t('@app.form.title')}
          value={title}
          // Cap at the server's 300-char limit the way the old native
          // maxLength did; TextInput cannot carry the attribute itself.
          onChange={value => { setTitle(value.slice(0, 300)); setTitleError(null); }}
          isRequired
          isDisabled={pending}
          placeholder={t('@app.form.titlePlaceholder')}
          {...(titleError ? { status: { type: 'error' as const, message: titleError } } : {})}
        />
        <TextArea label={t('@app.form.body')} value={content} onChange={setContent} isDisabled={pending} maxLength={100000} rows={10} />
        <ErrorNotice error={error} />
        <div>
          <Button label={pending ? t('@app.form.creating') : label} variant="primary" type="submit" isLoading={pending} />
        </div>
      </Stack>
    </form>
  );
}

export function ContextListPage() {
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const auth = useAuthSession();
  const query = useQuery({ queryKey: ['contexts', offset], queryFn: () => apiRequest<ContextSummary[]>(`/contexts?limit=20&offset=${offset}`), enabled: Boolean(auth.data?.user), refetchInterval: 5000 });
  const contexts = auth.data?.user ? query.data : undefined;
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Stack gap={2}>
            <Stack direction="horizontal" gap={4} vAlign="center" justify="between" wrap="wrap">
              <Heading level={1}>{t('@app.contexts.title')}</Heading>
              {auth.data?.user && <Button label={t('@app.contexts.new')} variant="primary" href="/contexts/new" />}
            </Stack>
            <Text type="body">{t('@app.contexts.intro')}</Text>
          </Stack>
          <ErrorNotice error={auth.error ?? (auth.data?.user ? query.error : null)} />
          {auth.isPending && <LoadingList />}
          {!auth.isPending && !auth.error && !auth.data?.user && <SignedOutNotice />}
          {auth.data?.user && query.isPending && <LoadingList />}
          {contexts?.length === 0 && (
            <EmptyState
              title={t('@app.contexts.emptyTitle')}
              description={t('@app.contexts.emptyDescription')}
              actions={<Button label={t('@app.contexts.emptyAction')} variant="primary" href="/contexts/new" />}
            />
          )}
          <Stack gap={3}>
            {contexts?.map(item => (
              <Card key={item.id}>
                <Stack gap={2}>
                  <Link href={`/contexts/${item.id}`} isStandalone>
                    <Heading level={2}>{item.title}</Heading>
                  </Link>
                  <Stack direction="horizontal" gap={2} vAlign="center" wrap="wrap">
                    <Badge variant={item.createdByType === 'agent' ? 'info' : 'neutral'} label={item.createdByType === 'agent' ? t('@app.common.agent') : t('@app.common.human')} />
                    <Text type="supporting">
                      {item.createdBy ?? t('@app.common.anonymous')} · {t('@app.contexts.updatedPrefix')} <RelativeTime value={item.updatedAt} />
                    </Text>
                  </Stack>
                  <CopyContextIdButton contextId={item.id} compact />
                </Stack>
              </Card>
            ))}
          </Stack>
          {auth.data?.user && contexts && (contexts.length > 0 || offset > 0) && (
            <Stack direction="horizontal" gap={3}>
              <Button label={t('@app.common.previous')} variant="secondary" isDisabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))} />
              <Button label={t('@app.common.next')} variant="secondary" isDisabled={!contexts || contexts.length < 20} onClick={() => setOffset(offset + 20)} />
            </Stack>
          )}
        </Stack>
      }
    />
  );
}

export function ContextCreatePage() {
  const { t } = useI18n();
  const navigate = useNavigate(); const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateContextInput) => apiRequest<ContextDetail>('/contexts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['contexts'] }); navigate(`/contexts/${data.id}`); },
  });
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Link href="/contexts">{t('@app.contexts.backToList')}</Link>
          <Stack gap={2}>
            <Heading level={1}>{t('@app.contexts.new')}</Heading>
            <Text type="body">{t('@app.contexts.createIntro')}</Text>
          </Stack>
          <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label={t('@app.contexts.create')} />
        </Stack>
      }
    />
  );
}

export function ContextDetailPage() {
  const { t } = useI18n();
  const { contextId } = useParams();
  const query = useQuery({ queryKey: ['context', contextId], queryFn: () => apiRequest<ContextDetail>(`/contexts/${contextId}`), refetchInterval: 5000 });
  const client = useQueryClient(); const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (data: CreateContextInput) => apiRequest<Thread>(`/contexts/${contextId}/threads`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['context', contextId] }); navigate(`/contexts/${contextId}/threads/${data.id}`); },
  });
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Link href="/contexts">{t('@app.contexts.backToList')}</Link>
          <ErrorNotice error={query.error} />
          {query.isPending && <Skeleton lines={6} heading />}
          {query.data && (
            <>
              <Stack gap={2}>
                <Heading level={1}>{query.data.title}</Heading>
                <Text type="supporting">
                  {t('@app.common.metaVersion', {
                    author: query.data.createdBy ?? (query.data.createdByType === 'agent' ? t('@app.common.agent') : t('@app.common.human')),
                    version: query.data.version,
                  })}
                </Text>
                <CopyContextIdButton contextId={query.data.id} />
              </Stack>
              <Card>
                <MarkdownContent content={query.data.content} />
              </Card>
              {/*
                Astryx Layout keeps its start/content slots on one unwrapped
                row with no narrow-screen collapse, so this two-column area
                uses the app-level responsive grid in styles.css instead.
              */}
              <div className="detail-grid">
                <Card>
                  <Stack gap={3}>
                    <Heading level={2}>{t('@app.threads.heading')}</Heading>
                    {query.data.threads.length === 0 && <Text type="supporting">{t('@app.threads.empty')}</Text>}
                    {query.data.threads.map(thread => (
                      <Link key={thread.id} href={`/contexts/${contextId}/threads/${thread.id}`} isStandalone>
                        {thread.title} · {thread.createdBy ?? (thread.createdByType === 'agent' ? t('@app.common.agent') : t('@app.common.human'))}
                      </Link>
                    ))}
                  </Stack>
                </Card>
                <Card>
                  <Stack gap={3}>
                    <Heading level={2}>{t('@app.threads.new')}</Heading>
                    <Text type="body">{t('@app.threads.newIntro')}</Text>
                    <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label={t('@app.threads.create')} />
                  </Stack>
                </Card>
              </div>
            </>
          )}
        </Stack>
      }
    />
  );
}

export function ThreadDetailPage() {
  const { t } = useI18n();
  const { contextId, threadId } = useParams();
  const query = useQuery({ queryKey: ['thread', contextId, threadId], queryFn: () => apiRequest<Thread>(`/contexts/${contextId}/threads/${threadId}`), refetchInterval: 5000 });
  return (
    <Layout
      height="auto"
      contentWidth={1120}
      content={
        <Stack gap={4}>
          <Link href={`/contexts/${contextId}`}>{t('@app.threads.backToContext')}</Link>
          <ErrorNotice error={query.error} />
          {query.isPending && <Skeleton lines={6} heading />}
          {query.data && (
            <>
              <Stack gap={2}>
                <Heading level={1}>{query.data.title}</Heading>
                <Text type="supporting">
                  {t('@app.common.metaVersion', {
                    author: query.data.createdBy ?? (query.data.createdByType === 'agent' ? t('@app.common.agent') : t('@app.common.human')),
                    version: query.data.version,
                  })}
                </Text>
              </Stack>
              <Card>
                <MarkdownContent content={query.data.content} />
              </Card>
            </>
          )}
        </Stack>
      }
    />
  );
}
