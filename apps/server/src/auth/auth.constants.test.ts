import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  generateOAuthState,
  googleAuthorizationUrl,
  hashSessionToken,
  parseCookies,
  safeRedirectPath,
  serializeCookie,
} from './auth.constants.js';

describe('cookie helpers', () => {
  it('parses Cookie headers into values', () => {
    expect(parseCookies('a=1; b=two%20words; broken')).toEqual({ a: '1', b: 'two words' });
    expect(parseCookies(undefined)).toEqual({});
  });
  it('serializes session cookies with the planned policy', () => {
    const cookie = serializeCookie({ name: 'cp_session', value: 'token', maxAgeSeconds: 60, httpOnly: true, secure: true });
    expect(cookie).toBe('cp_session=token; Path=/; SameSite=Lax; Max-Age=60; HttpOnly; Secure');
  });
});

describe('session token handling', () => {
  it('stores only the SHA-256 digest of opaque tokens', () => {
    const token = 'opaque-token';
    const digest = createHash('sha256').update(token).digest('hex');
    expect(hashSessionToken(token)).toBe(digest);
    expect(hashSessionToken('other')).not.toBe(digest);
  });
});

describe('OAuth state', () => {
  it('generates unpredictable states', () => {
    expect(generateOAuthState()).not.toBe(generateOAuthState());
    expect(generateOAuthState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('builds the Google authorization URL with openid email profile only', () => {
    const url = new URL(googleAuthorizationUrl({ clientId: 'cid', redirectUri: 'https://x.example/cb', state: 'st' }));
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.example/cb');
    expect(url.searchParams.get('state')).toBe('st');
  });
});

describe('redirect path validation', () => {
  it('keeps site-internal paths', () => {
    expect(safeRedirectPath('/contexts/abc?id=1')).toBe('/contexts/abc?id=1');
  });
  it('rejects protocol-relative, cross-origin and malformed paths', () => {
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('/a\\b')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
    expect(safeRedirectPath(undefined)).toBe('/');
  });
});
