import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, googleLoginUrl, logout, restoreLoginFragment, saveLoginFragment } from './auth';

describe('login fragment privacy', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  function browser(path = '/', search = '', hash = '') {
    const entries = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
      removeItem: (key: string) => { entries.delete(key); },
    };
    const history = { state: null, replaceState: vi.fn() };
    vi.stubGlobal('window', { sessionStorage, history, location: { pathname: path, search, hash } });
    return { entries, sessionStorage, history };
  }

  it('excludes the credential from the login URL while preserving path and query', () => {
    const url = googleLoginUrl('/clipboard?lang=zh-CN#passphrase=secret123');
    expect(url).toBe('/api/v1/auth/google/start?redirect=%2Fclipboard%3Flang%3Dzh-CN');
    expect(url).not.toContain('secret123');
    expect(googleLoginUrl('//example.com/#secret')).toBe('/api/v1/auth/google/start');
  });

  it('restores an exact fragment once on the matching return page', () => {
    const { entries, history } = browser('/clipboard', '?lang=zh-CN');
    const redirect = '/clipboard?lang=zh-CN#passphrase=hello%26%E4%B8%AD%E6%96%87';
    saveLoginFragment(redirect);
    restoreLoginFragment();
    expect(history.replaceState).toHaveBeenCalledWith(null, '', redirect);
    expect(entries.size).toBe(0);
    restoreLoginFragment();
    expect(history.replaceState).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/contexts', '', ''],
    ['/', '?login=denied', ''],
    ['/', '', '#passphrase=new-secret'],
  ])('does not restore over an unrelated location (%s%s%s)', (path, search, hash) => {
    const { entries, history } = browser(path, search, hash);
    saveLoginFragment('/#passphrase=secret123');
    restoreLoginFragment();
    expect(history.replaceState).not.toHaveBeenCalled();
    expect(entries.size).toBe(0);
  });

  it('discards expired credentials', () => {
    const { history } = browser();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    saveLoginFragment('/#passphrase=secret123');
    now.mockReturnValue(1_600_001);
    restoreLoginFragment();
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  it('clears an old fragment when a subsequent login has no fragment', () => {
    const { entries } = browser();
    saveLoginFragment('/#passphrase=secret123');
    saveLoginFragment('/contexts');
    expect(entries.size).toBe(0);
  });

  it('tolerates blocked session storage', () => {
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('Storage blocked'); } });
    expect(() => saveLoginFragment('/#passphrase=secret123')).not.toThrow();
    expect(() => restoreLoginFragment()).not.toThrow();
    expect(googleLoginUrl('/#passphrase=secret123')).toBe('/api/v1/auth/google/start?redirect=%2F');
  });
});

describe('auth request timeouts', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([['session', fetchMe], ['logout', logout]] as const)
    ('bounds a stalled %s request', async (_, request) => {
      const abort = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(abort.signal);
      vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
      })));
      const result = request();
      const assertion = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
      abort.abort(new DOMException('Request timed out', 'TimeoutError'));
      await assertion;
      expect(timeout).toHaveBeenCalledWith(20_000);
    });
});
