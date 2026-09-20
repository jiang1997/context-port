import { Link } from 'react-router-dom';

export function EmptyState() {
  return (
    <section className="empty-state">
      <span className="eyebrow">Ready for the first context</span>
      <h2>Keep task knowledge beyond the conversation</h2>
      <p>Create a task that humans and agents can continuously enrich, read, and hand off.</p>
      <Link className="button" to="/tasks/new">
        Create your first task
      </Link>
    </section>
  );
}
