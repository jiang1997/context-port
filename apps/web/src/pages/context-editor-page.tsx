import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createContext, getContext, updateContext } from '../api/contexts';
import { queryKeys } from '../api/query-keys';

export function ContextEditorPage() {
  const { contextId } = useParams();
  const editing = contextId !== undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const context = useQuery({
    queryKey: queryKeys.context(contextId ?? 'new'),
    queryFn: () => getContext(contextId as string),
    enabled: editing,
  });

  useEffect(() => {
    if (context.data) {
      setTitle(context.data.title);
      setContent(context.data.content);
    }
  }, [context.data]);

  const save = useMutation({
    mutationFn: () =>
      editing
        ? updateContext(contextId, { title, content })
        : createContext({ title, content }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contexts() });
      queryClient.setQueryData(queryKeys.context(saved.id), saved);
      navigate('/');
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  if (context.isPending && editing) {
    return <div className="page page-narrow"><p className="state-message">Loading context…</p></div>;
  }

  if (context.isError) {
    return <div className="page page-narrow"><p className="error-message">Context not found.</p></div>;
  }

  return (
    <div className="page page-narrow">
      <span className="eyebrow">{editing ? 'Edit context' : 'New context'}</span>
      <h1>{editing ? 'Update shared knowledge' : 'Create shared knowledge'}</h1>
      <p className="lead">Changes are immediately available through both the web app and MCP.</p>
      <form className="task-form" onSubmit={submit}>
        <label>
          Title
          <input
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example: Repository conventions"
            required
            value={title}
          />
        </label>
        <label>
          Content
          <textarea
            maxLength={100_000}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write the context in Markdown or plain text."
            required
            rows={16}
            value={content}
          />
        </label>
        {save.isError && <p className="error-message">Could not save the context.</p>}
        <div className="form-actions">
          <button className="button" disabled={save.isPending} type="submit">
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create context'}
          </button>
          <Link className="text-button" to="/">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
