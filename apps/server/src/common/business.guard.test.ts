import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({
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

describe('REST/MCP identity protection', () => {
  beforeEach(() => {
    config.WEB_EXTRA_ORIGINS = '';
    sessions.resolve.mockReset().mockResolvedValue(null);
    apiKeys.resolve.mockReset().mockResolvedValue(null);
  });
  it('rejects foreign origins and anonymous requests in local mode', async () => {
    await expect(guard().canActivate(request('/mcp', { origin: 'https://untrusted.example' }))).rejects.toThrow(ForbiddenException);
    await expect(guard().canActivate(request('/api/v1/contexts'))).rejects.toThrow(UnauthorizedException);
    await expect(guard().canActivate(request('/mcp'))).rejects.toThrow(UnauthorizedException);
  });
  it('allows the primary and extra origins', async () => {
    apiKeys.resolve.mockResolvedValue(USER_ID);
    const bearer = { authorization: 'Bearer cpk_test-key' };
    await expect(guard().canActivate(request('/mcp', { ...bearer, origin: 'http://localhost:5173' }))).resolves.toBe(true);
    config.WEB_EXTRA_ORIGINS = 'https://preview-1.example, https://preview-2.example';
    await expect(guard().canActivate(request('/mcp', { ...bearer, origin: 'https://preview-2.example' }))).resolves.toBe(true);
    await expect(guard().canActivate(request('/mcp', { ...bearer, origin: 'https://other.example' }))).rejects.toThrow(ForbiddenException);
  });
  it('requires a personal key or session for both business protocols', async () => {
    for (const path of ['/mcp', '/api/v1/contexts']) {
      await expect(guard().canActivate(request(path))).rejects.toThrow(UnauthorizedException);
      await expect(guard().canActivate(request(path, { authorization: 'Bearer incorrect' }))).rejects.toThrow(UnauthorizedException);
    }
  });
  it('leaves browser session endpoints public even when auth is enabled', async () => {
    await expect(guard().canActivate(request('/api/v1/auth/google/start'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/auth/google/callback'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/auth/me'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/contexts'))).rejects.toThrow();
  });
  it('allows anonymous clipboard calls but keeps other Context routes private', async () => {
    await expect(guard().canActivate(request('/api/v1/clipboard/open', {}, '127.0.0.1', 'POST'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/clipboard/read', {}, '127.0.0.1', 'POST'))).resolves.toBe(true);
    await expect(guard().canActivate(request('/api/v1/contexts', {}, '127.0.0.1', 'POST'))).rejects.toThrow(UnauthorizedException);
    await expect(guard().canActivate(request('/api/v1/clipboard/open', { origin: 'https://untrusted.example' }, '127.0.0.1', 'POST'))).rejects.toThrow(ForbiddenException);
  });
  it('resolves personal API keys to their owning user', async () => {
    apiKeys.resolve.mockResolvedValue('user-uuid');
    const context = request('/mcp', { authorization: 'Bearer cpk_some-key-value' });
    await expect(guard().canActivate(context)).resolves.toBe(true);
    const req = context.switchToHttp().getRequest() as unknown as { authIdentity?: { userId?: string; source: string } };
    expect(req.authIdentity).toEqual({ userId: 'user-uuid', source: 'api-key' });
  });
  it('rejects unknown and non-prefixed bearers in network mode', async () => {
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
