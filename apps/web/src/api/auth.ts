import { apiRequest } from './client';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface MeResponse {
  user: SessionUser | null;
  csrfToken: string | null;
}

export function fetchMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { signal: AbortSignal.timeout(20_000) });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST', signal: AbortSignal.timeout(20_000) });
}

/** Login entry point; `redirect` must stay site-internal and is validated server-side. */
export function googleLoginUrl(redirect?: string): string {
  const returnPath = redirect?.split('#', 1)[0];
  const query = returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//')
    ? `?redirect=${encodeURIComponent(returnPath)}`
    : '';
  return `/api/v1/auth/google/start${query}`;
}

const LOGIN_FRAGMENT_KEY = 'contextport.login-fragment';
const LOGIN_FRAGMENT_TTL = 10 * 60_000;

/** Called only when login is clicked; credentials never enter the OAuth URL. */
export function saveLoginFragment(redirect: string): void {
  try {
    window.sessionStorage.removeItem(LOGIN_FRAGMENT_KEY);
    const index = redirect.indexOf('#');
    if (index < 0) return;
    window.sessionStorage.setItem(LOGIN_FRAGMENT_KEY, JSON.stringify({
      path: redirect.slice(0, index), hash: redirect.slice(index), savedAt: Date.now(),
    }));
  } catch {
    // Storage can be disabled. Login still works without restoring the fragment.
  }
}

/** Restore before router creation so its initial location includes the fragment. */
export function restoreLoginFragment(): void {
  try {
    const stored = window.sessionStorage.getItem(LOGIN_FRAGMENT_KEY);
    if (!stored) return;
    window.sessionStorage.removeItem(LOGIN_FRAGMENT_KEY);
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object') return;
    const { path, hash, savedAt } = value as Record<string, unknown>;
    const { pathname, search, hash: currentHash } = window.location;
    if (path !== pathname + search || currentHash || typeof hash !== 'string' || !hash.startsWith('#')
      || typeof savedAt !== 'number' || !Number.isFinite(savedAt)
      || Date.now() < savedAt || Date.now() - savedAt > LOGIN_FRAGMENT_TTL) return;
    window.history.replaceState(window.history.state, '', pathname + search + hash);
  } catch {
    // A stale or inaccessible entry must not prevent the app from starting.
  }
}
