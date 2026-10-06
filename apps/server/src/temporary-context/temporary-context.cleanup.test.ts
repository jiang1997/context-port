import 'reflect-metadata';
import type { Database } from '@contextport/db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemporaryContextService } from './temporary-context.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('temporary context automatic cleanup', () => {
  afterEach(() => vi.useRealTimers());

  it('cleans on startup and every day, and stops on shutdown', async () => {
    vi.useFakeTimers();
    const service = new TemporaryContextService({} as Database);
    const cleanup = vi.spyOn(service, 'deleteExpired').mockResolvedValue();
    await service.onModuleInit();
    expect(cleanup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY_MS - 1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY_MS + 1);
    expect(cleanup).toHaveBeenCalledTimes(3);
    await service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it('retries after a cleanup failure', async () => {
    vi.useFakeTimers();
    const service = new TemporaryContextService({} as Database);
    const cleanup = vi.spyOn(service, 'deleteExpired').mockResolvedValue();
    await service.onModuleInit();
    cleanup.mockRejectedValueOnce(new Error('Database temporarily unavailable'));
    await vi.advanceTimersByTimeAsync(DAY_MS);
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(3);
    await service.onModuleDestroy();
  });

  it('does not overlap cleanup runs and waits for an active run on shutdown', async () => {
    vi.useFakeTimers();
    const service = new TemporaryContextService({} as Database);
    const cleanup = vi.spyOn(service, 'deleteExpired').mockResolvedValue();
    await service.onModuleInit();
    let finish!: () => void;
    cleanup.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    await vi.advanceTimersByTimeAsync(3 * DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(2);
    let stopped = false;
    const shutdown = service.onModuleDestroy().then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);
    finish();
    await shutdown;
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
