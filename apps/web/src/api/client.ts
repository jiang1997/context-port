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
  const csrfToken = readCsrfToken();
  if (csrfToken) headers.set('x-csrf-token', csrfToken);

  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include', ...init, headers });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined);
    throw new ApiError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}
