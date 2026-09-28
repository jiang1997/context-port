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
    <div className="document-list" role="status" aria-label="正在加载">
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
      title="还没有登录"
      action={
        <a className="button" href={googleLoginUrl(location.pathname)} rel="noreferrer">
          使用 Google 登录
        </a>
      }
    >
      登录后即可创建 Context，并把你的 Agent 通过 MCP 接入这个工作区。
    </Notice>
  );
}

export function ErrorNotice({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <p className="notice-title">出错了</p>
      <p className="notice-body">{error.message}</p>
    </div>
  );
}
