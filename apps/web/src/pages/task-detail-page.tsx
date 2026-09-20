import { useParams } from 'react-router-dom';

export function TaskDetailPage() {
  const { taskId } = useParams();

  return (
    <div className="page">
      <span className="eyebrow">Task detail scaffold</span>
      <h1>Task {taskId}</h1>
      <div className="detail-grid">
        <aside className="panel">
          <h2>Stages</h2>
          <p>Stage management and ordering will appear here once the REST service is connected.</p>
        </aside>
        <section className="panel timeline-panel">
          <h2>Context timeline</h2>
          <p>The current handoff, recent entries, and chunked content will appear here.</p>
        </section>
      </div>
    </div>
  );
}
