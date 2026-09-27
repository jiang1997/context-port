import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ API_AUTH_ENABLED: false, API_AUTH_TOKEN: 'test-token-at-least-24-characters', WEB_ORIGIN: 'http://localhost:5173', WEB_EXTRA_ORIGINS: '' }));
vi.mock('../config/environment.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/environment.js')>();
  return { ...actual, getEnvironment: () => config };
});
import { BusinessGuard } from './business.guard.js';
function request(path: string, headers: Record<string, string> = {}, hostname = '127.0.0.1') {
  return { switchToHttp: () => ({ getRequest: () => ({ path, headers, hostname }) }) } as ExecutionContext;
}
describe('shared REST/MCP protection', () => {
  beforeEach(() => { config.API_AUTH_ENABLED = false; config.WEB_EXTRA_ORIGINS = ''; });
  it('rejects foreign origins and hosts in local mode', () => {
    const guard = new BusinessGuard();
    expect(() => guard.canActivate(request('/mcp', { origin: 'https://untrusted.example' }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(request('/api/v1/contexts', {}, 'untrusted.example'))).toThrow();
    expect(guard.canActivate(request('/mcp'))).toBe(true);
  });
  it('allows the primary and extra origins', () => {
    const guard = new BusinessGuard();
    expect(guard.canActivate(request('/mcp', { origin: 'http://localhost:5173' }))).toBe(true);
    config.WEB_EXTRA_ORIGINS = 'https://preview-1.example, https://preview-2.example';
    expect(guard.canActivate(request('/mcp', { origin: 'https://preview-2.example' }))).toBe(true);
    expect(() => guard.canActivate(request('/mcp', { origin: 'https://other.example' }))).toThrow(ForbiddenException);
  });
  it('requires the configured token for both business protocols', () => {
    config.API_AUTH_ENABLED = true;
    const guard = new BusinessGuard();
    for (const path of ['/mcp', '/api/v1/contexts']) {
      expect(() => guard.canActivate(request(path))).toThrow();
      expect(() => guard.canActivate(request(path, { authorization: 'Bearer incorrect' }))).toThrow();
      expect(guard.canActivate(request(path, { authorization: `Bearer ${config.API_AUTH_TOKEN}` }))).toBe(true);
    }
  });
  it('leaves browser session endpoints public even when auth is enabled', () => {
    config.API_AUTH_ENABLED = true;
    const guard = new BusinessGuard();
    expect(guard.canActivate(request('/api/v1/auth/google/start'))).toBe(true);
    expect(guard.canActivate(request('/api/v1/auth/google/callback'))).toBe(true);
    expect(guard.canActivate(request('/api/v1/auth/me'))).toBe(true);
    expect(() => guard.canActivate(request('/api/v1/contexts'))).toThrow();
  });
});
