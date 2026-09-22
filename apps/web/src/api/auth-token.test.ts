import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { clearAuthToken, getStoredToken, initAuthToken, saveAuthToken } from './auth-token';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

async function lastAuthorizationHeader(): Promise<string | null> {
  await apiRequest('/contexts');
  const [, init] = vi.mocked(fetch).mock.calls[0] as [string, { headers: Headers }];
  return init.headers.get('authorization');
}

describe('runtime API token', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );
    clearAuthToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists the trimmed token and sends it as a Bearer header', async () => {
    saveAuthToken('  secret-token  ');
    expect(getStoredToken()).toBe('secret-token');
    expect(await lastAuthorizationHeader()).toBe('Bearer secret-token');
  });

  it('restores the stored token on init', async () => {
    saveAuthToken('restored-token');
    initAuthToken();
    expect(await lastAuthorizationHeader()).toBe('Bearer restored-token');
  });

  it('blank input and clear remove the token and the header', async () => {
    saveAuthToken('temporary');
    saveAuthToken('   ');
    expect(getStoredToken()).toBeUndefined();

    saveAuthToken('temporary');
    clearAuthToken();
    expect(getStoredToken()).toBeUndefined();
    expect(await lastAuthorizationHeader()).toBeNull();
  });
});
