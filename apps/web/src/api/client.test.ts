import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, readCsrfToken } from './client';

function cookieJar(cookies: string[]) {
  return { cookie: cookies.join('; ') };
}

describe('api client', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('attaches the CSRF double-submit header when the cookie exists', async () => {
    vi.stubGlobal('document', { cookie: 'cp_session=hidden; cp_csrf=csrf-value' });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/contexts', { method: 'POST', body: '{}' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Headers).get('x-csrf-token')).toBe('csrf-value');
    expect(init.credentials).toBe('include');
  });

  it('sends credentials and works without a CSRF cookie (pre-login GETs)', async () => {
    vi.stubGlobal('document', cookieJar([]));
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/contexts');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.credentials).toBe('include');
    expect((init.headers as Headers).get('x-csrf-token')).toBeNull();
  });

  it('resolves 204 responses without parsing JSON', async () => {
    vi.stubGlobal('document', cookieJar([]));
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest<void>('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('surfaces error payloads as ApiError', async () => {
    vi.stubGlobal('document', cookieJar([]));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ code: 'CONTEXT_NOT_FOUND' }) })));
    await expect(apiRequest('/contexts/nope')).rejects.toMatchObject({ status: 404 });
  });

  it('parses the csrf cookie value from document.cookie', () => {
    vi.stubGlobal('document', { cookie: 'cp_csrf=abc%2Bdef' });
    expect(readCsrfToken()).toBe('abc+def');
  });
  it('does not crash requests when the CSRF cookie is malformed', async () => {
    vi.stubGlobal('document', { cookie: 'cp_csrf=%ZZ' });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ user: null }) }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest('/auth/me')).resolves.toEqual({ user: null });
    expect(readCsrfToken()).toBeUndefined();
  });
});
