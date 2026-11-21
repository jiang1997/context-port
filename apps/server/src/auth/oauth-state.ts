import { createHmac } from 'node:crypto';
import { tokensEqual } from './auth.constants.js';

interface OAuthState {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string;
  issuedAt: number;
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update('contextport:oauth-state:').update(payload).digest('base64url');
}

export function signOAuthState(state: OAuthState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyOAuthState(cookie: string | undefined, secret: string | undefined): OAuthState | null {
  if (!cookie || !secret) return null;
  const [payload, mac, extra] = cookie.split('.');
  if (!payload || !mac || extra !== undefined || !tokensEqual(signature(payload, secret), mac)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    const { state, nonce, codeVerifier, redirectTo, issuedAt } = parsed as Record<string, unknown>;
    if (typeof state !== 'string' || !state || typeof nonce !== 'string' || !nonce
      || typeof codeVerifier !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(codeVerifier)
      || typeof redirectTo !== 'string' || typeof issuedAt !== 'number' || !Number.isFinite(issuedAt)) return null;
    return { state, nonce, codeVerifier, redirectTo, issuedAt };
  } catch {
    return null;
  }
}
