import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({
  GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret',
  PUBLIC_BASE_URL: 'https://app.example', DEPLOYMENT_MODE: 'network', COOKIE_SECURE: 'auto',
}));
vi.mock('../config/environment.js', async importOriginal => ({
  ...await importOriginal<typeof import('../config/environment.js')>(),
  getEnvironment: () => env,
}));
import { AuthController } from './auth.controller.js';
import { parseCookies, STATE_TTL_MS } from './auth.constants.js';

function setup() {
  const google = { authenticateWithCode: vi.fn().mockResolvedValue({ id: 'user-1' }) };
  const sessions = {
    issue: vi.fn().mockResolvedValue({ token: 'session-token', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    resolve: vi.fn().mockResolvedValue(null), revoke: vi.fn().mockResolvedValue(undefined),
  };
  const res = { setHeader: vi.fn(), redirect: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  return { google, sessions, res, controller: new AuthController(google as never, sessions as never), response: res as unknown as Response };
}
function req(query: Record<string, unknown> = {}, cookie?: string, headers: Record<string, string> = {}) {
  return { query, headers: { ...headers, ...(cookie === undefined ? {} : { cookie }) } } as unknown as Request;
}
function stateCookie(redirectTo = '/contexts', issuedAt = Date.now()) {
  return `cp_oauth_state=${encodeURIComponent(JSON.stringify({ state: 'expected-state', redirectTo, issuedAt }))}`;
}

describe('Google login controller', () => {
  beforeEach(() => { env.GOOGLE_CLIENT_ID = 'test-client'; });

  it('starts OAuth on the configured public origin and binds state to a secure cookie', () => {
    const { controller, res, response } = setup();
    controller.start(req({ redirect: '/contexts?offset=20' }), response);
    const destination = new URL(res.redirect.mock.calls[0]![1] as string);
    expect(destination.origin).toBe('https://accounts.google.com');
    expect(destination.searchParams.get('prompt')).toBe('select_account');
    expect(destination.searchParams.get('redirect_uri')).toBe('https://app.example/api/v1/auth/google/callback');
    const cookie = res.setHeader.mock.calls.find(([name]) => name === 'Set-Cookie')![1] as string;
    const stored = JSON.parse(parseCookies(cookie.split(';')[0])['cp_oauth_state']!);
    expect(stored.state).toBe(destination.searchParams.get('state'));
    expect(stored.redirectTo).toBe('/contexts?offset=20');
    expect(cookie).toContain('HttpOnly; Secure');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('returns 503 without redirecting when login is not configured', () => {
    env.GOOGLE_CLIENT_ID = '';
    const { controller, res, response } = setup();
    controller.start(req(), response);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it.each(['/contexts?q=100%25', '/contexts?q=%E4%B8%AD%E6%96%87', '/contexts?q=%22hello%22', '/contexts?q=%ZZ'])
    ('round-trips the encoded return path %s without a second decode', async redirectTo => {
      const { controller, res, response, google, sessions } = setup();
      await controller.callback(req({ code: 'code', state: 'expected-state' }, stateCookie(redirectTo)), response);
      expect(google.authenticateWithCode).toHaveBeenCalledWith('code', 'https://app.example/api/v1/auth/google/callback');
      expect(sessions.issue).toHaveBeenCalledWith('user-1');
      expect(res.redirect).toHaveBeenCalledWith(302, redirectTo);
      const cookies = res.setHeader.mock.calls.find(([name]) => name === 'Set-Cookie')![1] as string[];
      expect(cookies).toEqual(expect.arrayContaining([
        expect.stringContaining('cp_session=session-token; Path=/; SameSite=Lax;'),
        expect.stringContaining('cp_csrf='),
        expect.stringContaining('cp_oauth_state=; Path=/; SameSite=Lax; Max-Age=0'),
      ]));
      expect(cookies[0]).toContain('HttpOnly; Secure');
      expect(cookies[1]).not.toContain('HttpOnly');
    });

  it.each([
    undefined, 'cp_oauth_state=%ZZ', 'cp_oauth_state=null',
    stateCookie('/', Date.now() - STATE_TTL_MS - 1000), stateCookie('/', Date.now() + 60_000),
  ])('rejects missing, malformed, expired and future state cookies (%s)', async cookie => {
    const { controller, res, response, google, sessions } = setup();
    await controller.callback(req({ code: 'code', state: 'expected-state' }, cookie), response);
    expect(res.redirect).toHaveBeenCalledWith(302, '/?login=failed');
    expect(google.authenticateWithCode).not.toHaveBeenCalled();
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it.each([{ code: 'code', state: 'wrong' }, { code: '', state: 'expected-state' }, { code: ['code'], state: 'expected-state' }])
    ('rejects invalid callback parameters', async query => {
      const { controller, res, response, google } = setup();
      await controller.callback(req(query, stateCookie()), response);
      expect(res.redirect).toHaveBeenCalledWith(302, '/?login=failed');
      expect(google.authenticateWithCode).not.toHaveBeenCalled();
    });

  it('clears OAuth state when the user cancels authorization', async () => {
    const { controller, res, response, google } = setup();
    await controller.callback(req({ error: 'access_denied' }, stateCookie()), response);
    expect(res.redirect).toHaveBeenCalledWith(302, '/?login=denied');
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=0'));
    expect(google.authenticateWithCode).not.toHaveBeenCalled();
  });

  it.each(['exchange', 'session'])('handles %s failures without issuing session cookies', async stage => {
    const { controller, res, response, google, sessions } = setup();
    if (stage === 'exchange') google.authenticateWithCode.mockRejectedValue(new Error('exchange failed'));
    else sessions.issue.mockRejectedValue(new Error('database failed'));
    await controller.callback(req({ code: 'code', state: 'expected-state' }, stateCookie()), response);
    expect(res.redirect).toHaveBeenCalledWith(302, '/contexts?login=failed');
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('cp_oauth_state=;'));
  });

  it.each([{}, { 'x-csrf-token': 'wrong' }])('rejects logout with missing or mismatched CSRF', async headers => {
    const { controller, response, sessions } = setup();
    await expect(controller.logout(req({}, 'cp_session=token; cp_csrf=csrf', headers), response)).rejects.toThrow(ForbiddenException);
    expect(sessions.revoke).not.toHaveBeenCalled();
  });

  it('revokes the session and clears cookies on valid logout', async () => {
    const { controller, res, response, sessions } = setup();
    await controller.logout(req({}, 'cp_session=token; cp_csrf=csrf', { 'x-csrf-token': 'csrf' }), response);
    expect(sessions.revoke).toHaveBeenCalledWith('token');
    expect(res.status).toHaveBeenCalledWith(204);
    const cookies = res.setHeader.mock.calls.find(([name]) => name === 'Set-Cookie')![1] as string[];
    expect(cookies).toHaveLength(3);
    expect(cookies.every(cookie => cookie.includes('Max-Age=0'))).toBe(true);
  });

  it('keeps anonymous logout idempotent', async () => {
    const { controller, res, response } = setup();
    await controller.logout(req(), response);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
