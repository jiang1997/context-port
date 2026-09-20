import { useState, type FormEvent } from 'react';

export function TaskCreatePage() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="page page-narrow">
      <span className="eyebrow">New task</span>
      <h1>Create a shared task</h1>
      <p className="lead">Start with the goal and initial context. Stages, tags, and a handoff summary can follow.</p>
      <form className="task-form" onSubmit={submit}>
        <label>
          Title
          <input name="title" maxLength={200} placeholder="For example: Design an agent context handoff" required />
        </label>
        <label>
          Description
          <textarea name="description" rows={4} placeholder="Goals, constraints, or background" />
        </label>
        <label>
          Initial context
          <textarea name="initialContext" rows={9} placeholder="What should the next contributor know first?" />
        </label>
        <div className="form-actions">
          <button className="button" type="submit">Create task</button>
          {submitted && <span className="form-note">The UI scaffold is ready. REST writes will be connected in the next milestone.</span>}
        </div>
      </form>
    </div>
  );
}
