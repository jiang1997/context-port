import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'cp_session';
export const OAUTH_STATE_COOKIE = 'cp_oauth_state';
export const CSRF_COOKIE = 'cp_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Application session lifetime. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** One-shot OAuth state lifetime. */
export const STATE_TTL_MS = 10 * 60 * 1000;

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export function googleAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: input.state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params}`;
}

/** Parses a `Cookie` header into a map. Repeated names keep the last value. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const jar: Record<string, string> = {};
  if (!header) return jar;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}

/** Builds a `Set-Cookie` header value using the plan's session cookie policy. */
export function serializeCookie(input: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly: boolean;
  secure: boolean;
}): string {
  const attributes = [
    `${input.name}=${input.value}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${input.maxAgeSeconds}`,
    input.httpOnly ? 'HttpOnly' : '',
    input.secure ? 'Secure' : '',
  ].filter(Boolean);
  return attributes.join('; ');
}

/** Session tokens are opaque random strings; only their SHA-256 digest is stored. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function generateOAuthState(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Restricts the post-login redirect to a site-internal path: it must start
 * with a single `/` and never contain a protocol-independent jump.
 */
export function safeRedirectPath(value: string | undefined, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/[<>]/.test(value)) return fallback;
  return value;
}
