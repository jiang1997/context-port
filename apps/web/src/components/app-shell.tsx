import type { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthStatus } from './auth-status';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">CP</span>
          <span>
            <strong>ContextPort</strong>
            <small>Human ↔ Agent workspace</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Contexts
          </NavLink>
          <NavLink className="button button-small" to="/contexts/new">
            创建 Context
          </NavLink>
          <AuthStatus />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
