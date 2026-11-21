const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Reads the CSRF double-submit cookie issued at login. */
export function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)cp_csrf=([^;]*)/);
  try {
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const credentials = init.credentials ?? 'include';
  const method = (init.method ?? 'GET').toUpperCase();
  if (credentials !== 'omit' && !headers.has('x-csrf-token') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const crossOrigin = typeof window !== 'undefined'
      && new URL(apiBaseUrl, window.location.origin).origin !== window.location.origin;
    const csrfToken = crossOrigin
      ? (credentials === 'include' ? await fetchApiCsrfToken(init.signal) : undefined)
      : readCsrfToken();
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, credentials, headers });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    throw new ApiError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function fetchApiCsrfToken(signal?: AbortSignal | null) {
  // A direct API origin owns its own cookies. Read its token through credentialed CORS.
  const session = await apiRequest<{ csrfToken: string | null }>('/auth/me', { signal: signal ?? null });
  return session.csrfToken ?? undefined;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}
