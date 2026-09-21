import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ API_AUTH_ENABLED: false, API_AUTH_TOKEN: 'test-token-at-least-24-characters', WEB_ORIGIN: 'http://localhost:5173' }));
vi.mock('../config/environment.js', () => ({ getEnvironment: () => config }));
import { BusinessGuard } from './business.guard.js';
function request(path: string, headers: Record<string, string> = {}, hostname = '127.0.0.1') {
  return { switchToHttp: () => ({ getRequest: () => ({ path, headers, hostname }) }) } as ExecutionContext;
}
describe('shared REST/MCP protection', () => {
  beforeEach(() => { config.API_AUTH_ENABLED = false; });
  it('rejects foreign origins and hosts in local mode', () => {
    const guard = new BusinessGuard();
    expect(() => guard.canActivate(request('/mcp', { origin: 'https://untrusted.example' }))).toThrow();
    expect(() => guard.canActivate(request('/api/v1/contexts', {}, 'untrusted.example'))).toThrow();
    expect(guard.canActivate(request('/mcp'))).toBe(true);
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
});
