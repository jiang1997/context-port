import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContextDetail, ContextSummary, CreateContextInput, Thread } from '@contextport/contracts';
import { apiRequest } from '../api/client';
import { useAuthSession } from '../components/auth-status';
import { CopyContextIdButton } from '../components/copy-context-id';
import { MarkdownContent } from '../components/markdown-content';

function ErrorMessage({ error }: { error: Error | null }) {
  return error ? <p role="alert">{error.message}</p> : null;
}
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
    <label>标题<input name="title" required pattern={String.raw`.*\S.*`} maxLength={300} disabled={pending} /></label>
    <label>正文（Markdown）<textarea name="content" rows={10} maxLength={100000} disabled={pending} /></label>
    <ErrorMessage error={error} />
    <button className="button" disabled={pending}>{pending ? '正在创建…' : label}</button>
  </form>;
}
export function ContextListPage() {
  const [offset, setOffset] = useState(0);
  const auth = useAuthSession();
  const query = useQuery({ queryKey: ['contexts', offset], queryFn: () => apiRequest<ContextSummary[]>(`/contexts?limit=20&offset=${offset}`), enabled: Boolean(auth.data?.user), refetchInterval: 5000 });
  const contexts = auth.data?.user ? query.data : undefined;
  return <div className="page"><span className="eyebrow">共同维护的知识空间</span><h1>Contexts</h1>
    <p>一个 Context 保存整体背景，Thread 整理其中的具体话题。</p>
    <ErrorMessage error={auth.error ?? (auth.data?.user ? query.error : null)} />
    {auth.isPending && <p>正在检查登录状态…</p>}
    {!auth.isPending && !auth.error && !auth.data?.user && <p>请先使用右上角的 Google 登录。</p>}
    {auth.data?.user && query.isPending && <p>正在加载…</p>}
    {contexts?.length === 0 && <p>这里还没有 Context。创建一个，开始与 Agent 共享上下文。</p>}
    <div className="document-list">{contexts?.map(item => <article className="panel document-card" key={item.id}>
      <Link className="document-card-link" to={`/contexts/${item.id}`}>
        <h2>{item.title}</h2><p className="meta">{item.createdBy ?? item.createdByType} · {new Date(item.createdAt).toLocaleString()}</p>
      </Link>
      <CopyContextIdButton contextId={item.id} compact />
    </article>)}</div>
    <div className="form-actions"><button className="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>上一页</button>
    <button className="button" disabled={!contexts || contexts.length < 20} onClick={() => setOffset(offset + 20)}>下一页</button></div>
  </div>;
}
export function ContextCreatePage() {
  const navigate = useNavigate(); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (data: CreateContextInput) => apiRequest<ContextDetail>('/contexts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['contexts'] }); navigate(`/contexts/${data.id}`); } });
  return <div className="page page-narrow"><h1>创建 Context</h1><p>记录目标、背景与当前共识。</p>
    <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label="创建 Context" /></div>;
}
export function ContextDetailPage() {
  const { contextId } = useParams();
  const query = useQuery({ queryKey: ['context', contextId], queryFn: () => apiRequest<ContextDetail>(`/contexts/${contextId}`), refetchInterval: 5000 });
  const client = useQueryClient(); const navigate = useNavigate();
  const mutation = useMutation({ mutationFn: (data: CreateContextInput) => apiRequest<Thread>(`/contexts/${contextId}/threads`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async data => { await client.invalidateQueries({ queryKey: ['context', contextId] }); navigate(`/contexts/${contextId}/threads/${data.id}`); } });
  return <div className="page"><Link to="/">← 所有 Context</Link><ErrorMessage error={query.error} />
    {query.isPending && <p>正在加载…</p>}{query.data && <>
    <h1>{query.data.title}</h1><p className="meta">{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <p className="context-id-line"><span className="context-id-label">Context ID</span> <CopyContextIdButton contextId={query.data.id} /></p>
    <section className="panel"><MarkdownContent content={query.data.content} /></section>
    <div className="detail-grid"><section className="panel"><h2>Threads</h2>
    {query.data.threads.length === 0 && <p>还没有 Thread。</p>}
    {query.data.threads.map(thread => <Link className="thread-link" key={thread.id} to={`/contexts/${contextId}/threads/${thread.id}`}>{thread.title}<small>{thread.createdBy ?? thread.createdByType}</small></Link>)}
    </section><section className="panel"><h2>创建 Thread</h2><p>围绕这个 Context，展开一个具体话题。</p>
    <DocumentForm onSave={data => mutation.mutate(data)} pending={mutation.isPending} error={mutation.error} label="创建 Thread" />
    </section></div></>}
  </div>;
}
export function ThreadDetailPage() {
  const { contextId, threadId } = useParams();
  const query = useQuery({ queryKey: ['thread', contextId, threadId], queryFn: () => apiRequest<Thread>(`/contexts/${contextId}/threads/${threadId}`), refetchInterval: 5000 });
  return <div className="page"><Link to={`/contexts/${contextId}`}>← 返回 Context</Link>
    <ErrorMessage error={query.error} />{query.isPending && <p>正在加载…</p>}
    {query.data && <><span className="eyebrow thread-label">Thread</span><h1>{query.data.title}</h1>
    <p className="meta">{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <section className="panel"><MarkdownContent content={query.data.content} /></section></>}
  </div>;
}
