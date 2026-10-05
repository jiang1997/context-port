import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const signing = vi.hoisted(() => ({ publicKey: undefined as CryptoKey | undefined }));
vi.mock('jose', async importOriginal => ({
  ...await importOriginal<typeof import('jose')>(),
  // Use a local test issuer key; retain real cryptographic JWT verification.
  createRemoteJWKSet: () => async () => signing.publicKey!,
}));
vi.mock('../config/environment.js', () => ({
  getEnvironment: () => ({ GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret' }),
}));
import { GoogleAuthService } from './google-auth.service.js';

let privateKey: CryptoKey;
beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  signing.publicKey = pair.publicKey;
  privateKey = pair.privateKey;
});
afterEach(() => { vi.unstubAllGlobals(); });

async function token(overrides: JWTPayload = {}, omit: string[] = [], key?: CryptoKey) {
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    iss: 'https://accounts.google.com', aud: 'test-client', sub: 'google-user-1',
    iat: now, exp: now + 300, email: 'a@example.com', email_verified: true,
    name: 'Test User', ...overrides,
  };
  for (const claim of omit) delete payload[claim];
  return new SignJWT(payload).setProtectedHeader({ alg: 'RS256' }).sign(key ?? privateKey);
}
function setup(idToken?: string, ok = true) {
  const user = { id: 'local-user-1', email: 'a@example.com', name: 'Test User', avatarUrl: null };
  const updateValues = vi.fn().mockReturnValue({ where: () => ({ returning: async () => [user] }) });
  const db = {
    select: vi.fn().mockReturnValue({ from: () => ({ where: async () => [user] }) }),
    update: vi.fn().mockReturnValue({ set: updateValues }),
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => ({ id_token: idToken }) });
  vi.stubGlobal('fetch', fetchMock);
  return { service: new GoogleAuthService(db as never), db, user, fetchMock, updateValues };
}
const redirectUri = 'https://app.example/api/v1/auth/google/callback';

describe('Google ID Token validation', () => {
  it('exchanges the code with the same redirect URI and accepts a signed verified identity', async () => {
    const { service, user, fetchMock, updateValues } = setup(await token());
    await expect(service.authenticateWithCode('authorization-code', redirectUri)).resolves.toEqual(user);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    expect(init.body.get('redirect_uri')).toBe(redirectUri);
    expect(init.body.get('code')).toBe('authorization-code');
    expect(init.body.get('grant_type')).toBe('authorization_code');
    expect(updateValues).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@example.com', name: 'Test User' }));
  });

  it.each([
    { iss: 'https://evil.example' }, { aud: 'other-client' },
    { exp: Math.floor(Date.now() / 1000) - 120 }, { email_verified: false },
    { email: '' }, { sub: '' }, { azp: 'other-client' },
  ])('rejects invalid claims %j before touching the user database', async claims => {
    const { service, db } = setup(await token(claims));
    await expect(service.authenticateWithCode('code', redirectUri)).rejects.toThrow(UnauthorizedException);
    expect(db.select).not.toHaveBeenCalled();
  });

  it.each(['exp', 'iat', 'sub', 'email'])('rejects a token missing %s', async claim => {
    const { service, db } = setup(await token({}, [claim]));
    await expect(service.authenticateWithCode('code', redirectUri)).rejects.toThrow(UnauthorizedException);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('rejects a token signed with an untrusted key', async () => {
    const otherKey = await generateKeyPair('RS256');
    const { service, db } = setup(await token({}, [], otherKey.privateKey));
    await expect(service.authenticateWithCode('code', redirectUri)).rejects.toThrow(UnauthorizedException);
    expect(db.select).not.toHaveBeenCalled();
  });

  it.each([['missing token', undefined, true], ['exchange failure', undefined, false]] as const)
    ('rejects %s', async (_, idToken, ok) => {
      const { service, db } = setup(idToken, ok);
      await expect(service.authenticateWithCode('code', redirectUri)).rejects.toThrow(UnauthorizedException);
      expect(db.select).not.toHaveBeenCalled();
    });
});
