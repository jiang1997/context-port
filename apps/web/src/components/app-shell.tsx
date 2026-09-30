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
            Temporary Context
          </NavLink>
          <NavLink to="/contexts">My Contexts</NavLink>
          <NavLink to="/keys">MCP Keys</NavLink>
          <AuthStatus />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
