import { setBearerToken } from './client';

const STORAGE_KEY = 'contextport:api-token';

function readStored(): string | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(token: string | undefined): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. blocked cookies): keep the in-memory token only.
  }
}

/** Token lives in browser storage at runtime; it is never baked into the bundle. */
export function getStoredToken(): string | undefined {
  return readStored();
}

/** Apply the stored token to API requests. Call once at startup. */
export function initAuthToken(): void {
  setBearerToken(readStored());
}

export function saveAuthToken(raw: string): void {
  const token = raw.trim() || undefined;
  writeStored(token);
  setBearerToken(token);
}

export function clearAuthToken(): void {
  writeStored(undefined);
  setBearerToken(undefined);
}
