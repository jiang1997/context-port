import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, logout } from './auth';

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
