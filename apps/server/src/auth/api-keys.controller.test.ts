import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiKeysController } from './api-keys.controller.js';

function setup() {
  const sessions = {
    resolve: vi.fn(async (token: string | undefined) =>
      token === 'valid-token' ? { id: 'user-1', email: 'a@example.com' } : null,
    ),
  };
  const keys = {
    issue: vi.fn(async () => ({ id: 'key-id', name: 'k', createdAt: 'now', key: 'cpk_raw' })),
    revoke: vi.fn(async () => true),
  };
  const controller = new ApiKeysController(keys as never, sessions as never);
  return { controller, sessions, keys };
}

function req(cookie: string | undefined, csrfHeader: string | undefined) {
  const headers: Record<string, string> = {};
  if (cookie !== undefined) headers.cookie = cookie;
  if (csrfHeader !== undefined) headers['x-csrf-token'] = csrfHeader;
  return { headers, method: 'POST' } as never;
}

describe('ApiKeysController CSRF', () => {
  it('rejects writes when both CSRF cookie and header are missing', async () => {
    const { controller } = setup();
    await expect(controller.create(req('cp_session=valid-token', undefined), { name: 'k' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.revoke(req('cp_session=valid-token', undefined), '0d2c9a55-6a15-4f0e-9f3a-0d3e40b07a01'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when either side is missing or mismatched', async () => {
    const { controller } = setup();
    await expect(controller.create(req(undefined, 'abc'), { name: 'k' })).rejects.toThrow();
    await expect(
      controller.create(req('cp_session=valid-token; cp_csrf=abc', undefined), { name: 'k' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(controller.create(req('cp_session=valid-token', 'abc'), { name: 'k' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      controller.create(req('cp_session=valid-token; cp_csrf=abc', 'other'), { name: 'k' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects empty-string CSRF cookie and header', async () => {
    const { controller } = setup();
    await expect(
      controller.create(req('cp_session=valid-token; cp_csrf=', ''), { name: 'k' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows matching double-submit tokens', async () => {
    const { controller, keys } = setup();
    await controller.create(req('cp_session=valid-token; cp_csrf=abc', 'abc'), { name: 'k' });
    expect(keys.issue).toHaveBeenCalledOnce();
  });
});
