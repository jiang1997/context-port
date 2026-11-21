import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseMaintenance } from './database-maintenance.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function setup() {
  const sessions = { pruneExpired: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) };
  const temporary = { deleteExpired: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) };
  return { service: new DatabaseMaintenance(sessions as never, temporary as never), sessions, temporary };
}

describe('database maintenance', () => {
  afterEach(() => vi.useRealTimers());

  it('cleans on startup and every day, and stops on shutdown', async () => {
    vi.useFakeTimers();
    const { service, sessions, temporary } = setup();
    const cleanup = temporary.deleteExpired;
    await service.onModuleInit();
    expect(cleanup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY_MS - 1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY_MS + 1);
    expect(cleanup).toHaveBeenCalledTimes(3);
    expect(sessions.pruneExpired).toHaveBeenCalledTimes(3);
    await service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(3);
    expect(sessions.pruneExpired).toHaveBeenCalledTimes(3);
  });

  it('retries after a cleanup failure', async () => {
    vi.useFakeTimers();
    const { service, sessions, temporary } = setup();
    const cleanup = temporary.deleteExpired;
    await service.onModuleInit();
    sessions.pruneExpired.mockRejectedValueOnce(new Error('Database temporarily unavailable'));
    await vi.advanceTimersByTimeAsync(DAY_MS);
    await vi.advanceTimersByTimeAsync(DAY_MS);
    expect(cleanup).toHaveBeenCalledTimes(3);
    expect(sessions.pruneExpired).toHaveBeenCalledTimes(3);
    await service.onModuleDestroy();
  });

  it('does not overlap cleanup runs and waits for an active run on shutdown', async () => {
    vi.useFakeTimers();
    const { service, sessions, temporary } = setup();
    const cleanup = temporary.deleteExpired;
    await service.onModuleInit();
    let finish!: () => void;
    sessions.pruneExpired.mockRejectedValueOnce(new Error('Database temporarily unavailable'));
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
