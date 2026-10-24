import { describe, expect, it, vi } from 'vitest';

const bundles = vi.hoisted(() => new Map<string, { db: { execute: () => string }; pool: { end: ReturnType<typeof vi.fn> } }>());
vi.mock('@contextport/db', () => ({
  createDatabase: (url: string) => {
    const bundle = { db: { execute: () => url }, pool: { end: vi.fn().mockResolvedValue(undefined) } };
    bundles.set(url, bundle);
    return bundle;
  },
}));
import { requestDatabase, withRequestDatabase } from './request-database.js';

describe('Workers request database', () => {
  it('isolates concurrent invocations and closes both pools', async () => {
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const first = withRequestDatabase('first', async () => {
      await barrier;
      return requestDatabase.execute('select 1');
    });
    const second = withRequestDatabase('second', async () => {
      release();
      return requestDatabase.execute('select 1');
    });
    expect(await Promise.all([first, second])).toEqual(['first', 'second']);
    expect(bundles.get('first')!.pool.end).toHaveBeenCalledOnce();
    expect(bundles.get('second')!.pool.end).toHaveBeenCalledOnce();
  });

  it('closes the pool when request processing fails', async () => {
    await expect(withRequestDatabase('failed', async () => {
      throw new Error('Request failed');
    })).rejects.toThrow('Request failed');
    expect(bundles.get('failed')!.pool.end).toHaveBeenCalledOnce();
  });

  it('rejects database access outside an invocation', () => {
    expect(() => requestDatabase.execute('select 1')).toThrow('requires a Workers invocation');
  });
});
