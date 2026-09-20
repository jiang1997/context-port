import { EmptyState } from '../components/empty-state';

export function TaskListPage() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Shared source of truth</span>
          <h1>Tasks</h1>
          <p>Review active tasks, recent context, and handoff status in one place.</p>
        </div>
        <div className="status-chip"><span /> API scaffold ready</div>
      </div>
      <EmptyState />
    </div>
  );
}
