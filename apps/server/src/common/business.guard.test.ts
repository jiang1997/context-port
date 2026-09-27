import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({
  API_AUTH_ENABLED: false,
  API_AUTH_TOKEN: 'test-token-at-least-24-characters',
  API_AUTH_LEGACY_USER_ID: undefined as string | undefined,
  WEB_ORIGIN: 'http://localhost:5173',
  WEB_EXTRA_ORIGINS: '',
}));
vi.mock('../config/environment.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/environment.js')>();
  return { ...actual, getEnvironment: () => config };
});
import { BusinessGuard } from './business.guard.js';

const sessions = { resolve: vi.fn() };
const apiKeys = { resolve: vi.fn() };
function guard() { return new BusinessGuard(sessions as never, apiKeys as never); }
function request(path: string, headers: Record<string, string> = {}, hostname = '127.0.0.1', method = 'GET') {
  const req = { path, headers, hostname, method } as Record<string, unknown>;
  return { switchToHttp: () => ({ getRequest: () => req }) } as ExecutionContext;
}
const USER_ID = '0d2c9a55-6a15-4f0e-9f3a-0d3e40b07a01';

describe('shared REST/MCP protection', () => {
  beforeEach(() => {
    config.API_AUTH_ENABLED = false;
    config.WEB_EXTRA_ORIGINS = '';
    config.API_AUTH_LEGACY_USER_ID = undefined;
    sessions.resolve.mockReset().mockResolvedValue(null);
    apiKeys.resolve.mockReset().mockResolvedValue(null);
  });
  it('rejects foreign origins and hosts in local mode', async () => {
    await expect(guard().canActivate(request('/mcp', { origin: 'https://untrusted.example' }))).rejects.toThrow(ForbiddenException);
    await expect(guard().canActivate(request('/api/v1/contexts', {}, 'untrusted.example'))).rejects.toThrow();
    await expect(guard().canActivate(request('/mcp'))).resolves.toBe(true);
  });
  it('allows the primary and extra origins', async () => {
    await expect(guard().canActivate(request('/mcp', { origin: 'http://localhost:5173' }))).resolves.toBe(true);
    config.WEB_EXTRA_ORIGINS = 'https://preview-1.example, https://preview-2.example';
    await expect(guard().canActivate(request('/mcp', { origin: 'https://preview-2.example' }))).resolves.toBe(true);
    await expect(guard().canActivate(request('/mcp', { origin: 'https://other.example' }))).rejects.toThrow(ForbiddenException);
  });
  it('requires the configured token for both business protocols', async () => {
    config.API_AUTH_ENABLED = true;
    for (const path of ['/mcp', '/api/v1/contexts']) {
      await expect(guard().canActivate(request(path))).rejects.toThrow(UnauthorizedException);
      await expect(guard().canActivate(request(path, { authorization: 'Bearer incorrect' }))).rejects.toThrow(UnauthorizedException);
      await expect(guard().canActivate(request(path, { authorization: `Bearer ${config.API_AUTH_TOKEN}` }))).resolves.toBe(true);
    }
  });
  it('leaves browser session endpoints public even when auth is enabled', async () => {
    config.API_AUTH_ENABLED = true;
    await expect(guard().canActivate(request('/api/v1/auth/google/start'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/auth/google/callback'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/auth/me'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/contexts'))).rejects.toThrow();
  });
  it('binds the legacy shared token to its owner when configured', async () => {
    config.API_AUTH_ENABLED = true;
    config.API_AUTH_LEGACY_USER_ID = USER_ID;
    const context = request('/api/v1/contexts', { authorization: `Bearer ${config.API_AUTH_TOKEN}` });
    await expect(guard().canActivate(context)).resolves.toBe(true);
    const req = context.switchToHttp().getRequest() as unknown as { authIdentity?: { userId?: string; source: string } };
    expect(req.authIdentity).toEqual({ userId: USER_ID, source: 'legacy-token' });
  });
  it('keeps the legacy token pre-migration (anonymous) before a owner is bound', async () => {
    config.API_AUTH_ENABLED = true;
    const context = request('/api/v1/contexts', { authorization: `Bearer ${config.API_AUTH_TOKEN}` });
    await expect(guard().canActivate(context)).resolves.toBe(true);
    const req = context.switchToHttp().getRequest() as unknown as { authIdentity?: { userId?: string; source: string } };
    expect(req.authIdentity).toEqual({ source: 'legacy-token' });
  });
  it('resolves personal API keys to their owning user', async () => {
    config.API_AUTH_ENABLED = true;
    apiKeys.resolve.mockResolvedValue('user-uuid');
    const context = request('/mcp', { authorization: 'Bearer cpk_some-key-value' });
    await expect(guard().canActivate(context)).resolves.toBe(true);
    const req = context.switchToHttp().getRequest() as unknown as { authIdentity?: { userId?: string; source: string } };
    expect(req.authIdentity).toEqual({ userId: 'user-uuid', source: 'api-key' });
  });
  it('rejects unknown and non-prefixed bearers in network mode', async () => {
    config.API_AUTH_ENABLED = true;
    await expect(guard().canActivate(request('/mcp', { authorization: 'Bearer cpk_unknown' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard().canActivate(request('/mcp', { authorization: 'Bearer other-secret' }))).rejects.toThrow(UnauthorizedException);
  });
  it('resolves session cookies and enforces CSRF on writes', async () => {
    sessions.resolve.mockResolvedValue({ id: 'user-uuid', email: 'a@example.com' });
    const reads = request('/api/v1/contexts', { cookie: 'cp_session=token; cp_csrf=csrf-value' });
    await expect(guard().canActivate(reads)).resolves.toBe(true);
    const readReq = reads.switchToHttp().getRequest() as unknown as { authIdentity?: { userId?: string; source: string } };
    expect(readReq.authIdentity).toEqual({ userId: 'user-uuid', source: 'session' });

    const write = request('/api/v1/contexts', { cookie: 'cp_session=token; cp_csrf=csrf-value' }, '127.0.0.1', 'POST');
    await expect(guard().canActivate(write)).rejects.toThrow(ForbiddenException);
    const writeOk = request('/api/v1/contexts', { cookie: 'cp_session=token; cp_csrf=csrf-value', 'x-csrf-token': 'csrf-value' }, '127.0.0.1', 'POST');
    await expect(guard().canActivate(writeOk)).resolves.toBe(true);
  });
});
