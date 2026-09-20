import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deleteContext, listContexts } from '../api/contexts';
import { queryKeys } from '../api/query-keys';

export function ContextListPage() {
  const queryClient = useQueryClient();
  const contexts = useQuery({ queryKey: queryKeys.contexts(), queryFn: listContexts });
  const remove = useMutation({
    mutationFn: deleteContext,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.contexts() }),
  });

  function confirmDelete(contextId: string, title: string) {
    if (window.confirm(`Delete “${title}”? This cannot be undone.`)) {
      remove.mutate(contextId);
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Shared knowledge</span>
          <h1>Contexts</h1>
          <p>Create and maintain context that is immediately available to humans and agents.</p>
        </div>
        <div className="status-chip"><span /> MCP: /mcp</div>
      </div>

      {contexts.isPending && <p className="state-message">Loading contexts…</p>}
      {contexts.isError && <p className="error-message">Could not load contexts. Is the server running?</p>}
      {remove.isError && <p className="error-message">Could not delete the context.</p>}

      {contexts.data?.length === 0 && (
        <section className="empty-state">
          <span className="eyebrow">Ready for the first context</span>
          <h2>Keep knowledge beyond the conversation</h2>
          <p>Create a context that agents can read and update through MCP.</p>
          <Link className="button" to="/contexts/new">Create your first context</Link>
        </section>
      )}

      {contexts.data && contexts.data.length > 0 && (
        <section className="context-grid" aria-label="Shared contexts">
          {contexts.data.map((context) => (
            <article className="context-card" key={context.id}>
              <div>
                <span className="context-date">
                  Updated {new Date(context.updatedAt).toLocaleString()}
                </span>
                <h2>{context.title}</h2>
                <p>{context.content}</p>
              </div>
              <div className="card-actions">
                <Link className="text-button" to={`/contexts/${context.id}`}>Edit</Link>
                <button
                  className="text-button danger"
                  disabled={remove.isPending}
                  onClick={() => confirmDelete(context.id, context.title)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
