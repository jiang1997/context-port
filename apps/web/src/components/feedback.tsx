import type { ReactNode } from 'react';
import { googleLoginUrl } from '../api/auth';
import { useLocation } from 'react-router-dom';

/**
 * Placeholder bars shown while a query is in flight, so the page keeps its
 * shape instead of collapsing to a single line of body text.
 */
export function Skeleton({ lines = 3, heading = false }: { lines?: number; heading?: boolean }) {
  return (
    <div className="skeleton" aria-hidden>
      {heading && <span className="skeleton-heading" />}
      {Array.from({ length: lines }, (_, index) => <span key={index} />)}
    </div>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="document-list" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div className="panel document-card" key={index}>
          <Skeleton lines={2} heading />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty and signed-out states. These used to be bare sentences in the same
 * grey as body copy, which made "you have no data yet" and "your document is
 * empty" indistinguishable from content.
 */
export function Notice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="notice">
      <p className="notice-title">{title}</p>
      {children ? <p className="notice-body">{children}</p> : null}
      {action ? <div className="notice-action">{action}</div> : null}
    </div>
  );
}

/** Shown on every data-backed page until the session check resolves. */
export function SignedOutNotice() {
  const location = useLocation();
  return (
    <Notice
      title="Not signed in"
      action={
        <a className="button" href={googleLoginUrl(location.pathname)} rel="noreferrer">
          Sign in with Google
        </a>
      }
    >
      Sign in to create Contexts and to connect your agents to this workspace over MCP.
    </Notice>
  );
}

export function ErrorNotice({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <p className="notice-title">Something went wrong</p>
      <p className="notice-body">{error.message}</p>
    </div>
  );
}
