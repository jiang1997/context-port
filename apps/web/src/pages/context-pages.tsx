import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContextDetail, ContextSummary, CreateContextInput, Thread } from '@contextport/contracts';
import { apiRequest } from '../api/client';
import { useAuthSession } from '../components/auth-status';
import { CopyContextIdButton } from '../components/copy-context-id';
import { MarkdownContent } from '../components/markdown-content';
import { RelativeTime } from '../components/relative-time';
import { ErrorNotice, LoadingList, Notice, SignedOutNotice, Skeleton } from '../components/feedback';

function DocumentForm({ onSave, pending, error, label }: {
  onSave: (data: { title: string; content: string; createdByType: 'human' }) => void;
  pending: boolean; error: Error | null; label: string;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title')).trim();
    if (!title) return;
    onSave({ title, content: String(data.get('content')), createdByType: 'human' });
  }
  return <form className="task-form" onSubmit={submit}>
    <label>Title<input name="title" required pattern={String.raw`.*\S.*`} maxLength={300} disabled={pending} /></label>
    <label>Body (Markdown)<textarea name="content" rows={10} maxLength={100000} disabled={pending} /></label>
    <ErrorNotice error={error} />
    <button className="button" disabled={pending}>{pending ? 'Creating…' : label}</button>
  </form>;
}
export function ContextListPage() {
  const [offset, setOffset] = useState(0);
  const auth = useAuthSession();
  const query = useQuery({ queryKey: ['contexts', offset], queryFn: () => apiRequest<ContextSummary[]>(`/contexts?limit=20&offset=${offset}`), enabled: Boolean(auth.data?.user), refetchInterval: 5000 });
  const contexts = auth.data?.user ? query.data : undefined;
  return <div className="page">
    <div className="page-heading">
      <div>
        <span className="eyebrow">A shared knowledge space</span>
        <h1>My Contexts</h1>
      </div>
      {auth.data?.user && <Link className="button" to="/contexts/new">New Context</Link>}
    </div>
    <p>A Context holds the overall background; Threads organize the specific topics inside it.</p>
    <ErrorNotice error={auth.error ?? (auth.data?.user ? query.error : null)} />
    {auth.isPending && <LoadingList />}
    {!auth.isPending && !auth.error && !auth.data?.user && <SignedOutNotice />}
    {auth.data?.user && query.isPending && <LoadingList />}
    {contexts?.length === 0 && (
      <Notice
        title="No Contexts yet"
        action={<Link className="button" to="/contexts/new">Create your first Context</Link>}
      >
        Create a background document that people and agents can keep building on together.
      </Notice>
    )}
    <div className="document-list">{contexts?.map(item => <article className="panel document-card" key={item.id}>
      <Link className="document-card-link" to={`/contexts/${item.id}`}>
        <h2>{item.title}</h2>
        <p className="meta">
          <span className={`origin-badge origin-${item.createdByType}`}>{item.createdByType === 'agent' ? 'Agent' : 'Human'}</span>
          {item.createdBy ?? 'Anonymous'} · updated <RelativeTime value={item.updatedAt} />
        </p>
      </Link>
      <CopyContextIdButton contextId={item.id} compact />
    </article>)}</div>
    <div className="form-actions"><button className="button button-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button>
    <button className="button button-secondary" disabled={!contexts || contexts.length < 20} onClick={() => setOffset(offset + 20)}>Next</button></div>
  </div>;
}
export function ContextCreatePage() {
  const navigate = useNavigate(); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (data: CreateContextInput) => apiRequest<ContextDetail>('/contexts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['contexts'] }); navigate(`/contexts/${data.id}`); } });
  return <div className="page page-narrow"><span className="eyebrow">A new shared document</span><h1>New Context</h1><p>Record the goal, the background, and the current shared understanding.</p>
    <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label="Create Context" /></div>;
}
export function ContextDetailPage() {
  const { contextId } = useParams();
  const query = useQuery({ queryKey: ['context', contextId], queryFn: () => apiRequest<ContextDetail>(`/contexts/${contextId}`), refetchInterval: 5000 });
  const client = useQueryClient(); const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (data: CreateContextInput) => apiRequest<Thread>(`/contexts/${contextId}/threads`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['context', contextId] }); navigate(`/contexts/${contextId}/threads/${data.id}`); } });
  return <div className="page"><Link className="back-link" to="/contexts">← My Contexts</Link><ErrorNotice error={query.error} />
    {query.isPending && <Skeleton lines={6} heading />}{query.data && <>
    <h1>{query.data.title}</h1><p className="meta">{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <p className="context-id-line"><span className="context-id-label">Context ID</span> <CopyContextIdButton contextId={query.data.id} /></p>
    <section className="panel"><MarkdownContent content={query.data.content} /></section>
    <div className="detail-grid"><section className="panel"><h2>Threads</h2>
    {query.data.threads.length === 0 && <p className="panel-hint">No threads yet. Start the first one on the right.</p>}
    {query.data.threads.map(thread => <Link className="thread-link" key={thread.id} to={`/contexts/${contextId}/threads/${thread.id}`}>{thread.title}<small>{thread.createdBy ?? thread.createdByType}</small></Link>)}
    </section><section className="panel"><h2>New Thread</h2><p>Open a specific topic within this Context.</p>
    <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label="Create Thread" />
    </section></div></>}
  </div>;
}
export function ThreadDetailPage() {
  const { contextId, threadId } = useParams();
  const query = useQuery({ queryKey: ['thread', contextId, threadId], queryFn: () => apiRequest<Thread>(`/contexts/${contextId}/threads/${threadId}`), refetchInterval: 5000 });
  return <div className="page"><Link className="back-link" to={`/contexts/${contextId}`}>← Back to Context</Link>
    <ErrorNotice error={query.error} />{query.isPending && <Skeleton lines={6} heading />}
    {query.data && <><span className="eyebrow thread-label">Thread</span><h1>{query.data.title}</h1>
    <p className="meta">{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <section className="panel"><MarkdownContent content={query.data.content} /></section></>}
  </div>;
}
