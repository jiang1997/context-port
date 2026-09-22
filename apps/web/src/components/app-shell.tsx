import { useState, type FormEvent, type PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { clearAuthToken, getStoredToken, saveAuthToken } from '../api/auth-token';

export function AppShell({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState(() => getStoredToken() ?? '');
  const [hasToken, setHasToken] = useState(() => getStoredToken() !== undefined);

  function onSaveToken(event: FormEvent) {
    event.preventDefault();
    saveAuthToken(tokenInput);
    setHasToken(getStoredToken() !== undefined);
    void queryClient.invalidateQueries();
  }

  function onClearToken() {
    clearAuthToken();
    setTokenInput('');
    setHasToken(false);
    void queryClient.invalidateQueries();
  }

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
          {hasToken ? (
            <span className="token-saved">
              <span className="token-dot" aria-hidden />
              已连接
              <button type="button" className="token-clear" onClick={onClearToken}>
                清除
              </button>
            </span>
          ) : (
            <form className="token-form" onSubmit={onSaveToken}>
              <input
                type="password"
                autoComplete="off"
                placeholder="API Token"
                aria-label="API Token"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
              />
              <button type="submit" className="button button-small">
                连接
              </button>
            </form>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
