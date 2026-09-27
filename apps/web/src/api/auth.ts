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
  return apiRequest<MeResponse>('/auth/me');
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

/** Login entry point; `redirect` must stay site-internal and is validated server-side. */
export function googleLoginUrl(redirect?: string): string {
  const query = redirect && redirect.startsWith('/') && !redirect.startsWith('//')
    ? `?redirect=${encodeURIComponent(redirect)}`
    : '';
  return `/api/v1/auth/google/start${query}`;
}
