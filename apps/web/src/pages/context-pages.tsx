import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContextDetail, ContextSummary, CreateContextInput, Thread } from '@contextport/contracts';
import { apiRequest } from '../api/client';

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
  const query = useQuery({ queryKey: ['contexts', offset], queryFn: () => apiRequest<ContextSummary[]>(`/contexts?limit=20&offset=${offset}`), refetchInterval: 5000 });
  return <div className="page"><span className="eyebrow">共同维护的知识空间</span><h1>Contexts</h1>
    <p>一个 Context 保存整体背景，Thread 整理其中的具体话题。</p>
    <ErrorMessage error={query.error} />{query.isPending && <p>正在加载…</p>}
    {query.data?.length === 0 && <p>这里还没有 Context。创建一个，开始与 Agent 共享上下文。</p>}
    <div className="document-list">{query.data?.map(item => <Link className="panel document-card" to={`/contexts/${item.id}`} key={item.id}>
      <h2>{item.title}</h2><p>{item.createdBy ?? item.createdByType} · {new Date(item.createdAt).toLocaleString()}</p>
    </Link>)}</div>
    <div className="form-actions"><button className="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>上一页</button>
    <button className="button" disabled={!query.data || query.data.length < 20} onClick={() => setOffset(offset + 20)}>下一页</button></div>
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
    <h1>{query.data.title}</h1><p>{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <section className="panel"><pre className="document-body">{query.data.content || '暂无正文'}</pre></section>
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
    <p>{query.data.createdBy ?? query.data.createdByType} · v{query.data.version}</p>
    <section className="panel"><pre className="document-body">{query.data.content || '暂无正文'}</pre></section></>}
  </div>;
}
