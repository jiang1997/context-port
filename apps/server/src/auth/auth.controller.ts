import { createHash } from 'node:crypto';
import { Controller, Get, Header, Post, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getEnvironment, usesSecureCookies } from '../config/environment.js';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  STATE_TTL_MS,
  generateCsrfToken,
  generateOAuthState,
  generateSessionToken,
  googleAuthorizationUrl,
  parseCookies,
  safeRedirectPath,
  serializeCookie,
  tokensEqual,
} from './auth.constants.js';
import { Public } from './auth-policy.decorator.js';
import { assertCsrf } from './csrf.js';
import { GoogleAuthService } from './google-auth.service.js';
import { signOAuthState, verifyOAuthState } from './oauth-state.js';
import { SessionService, type SessionUser } from './session.service.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(GoogleAuthService) private readonly google: GoogleAuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  /** Starts the authorization-code flow, carrying `state` and the intended redirect. */
  @Get('google/start')
  @Public()
  start(@Req() req: Request, @Res() res: Response): void {
    res.setHeader('Cache-Control', 'no-store');
    if (!this.isConfigured()) {
      res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: 'Google login is not configured.' });
      return;
    }
    const environment = getEnvironment();
    const state = generateOAuthState();
    const nonce = generateOAuthState();
    const codeVerifier = generateSessionToken();
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const redirectTo = safeRedirectPath(typeof req.query.redirect === 'string' ? req.query.redirect : undefined);
    const statePayload = signOAuthState({ state, nonce, codeVerifier, redirectTo, issuedAt: Date.now() },
      environment.GOOGLE_CLIENT_SECRET!);
    // The cookie binds the state returned by Google to this browser.
    res.setHeader('Set-Cookie', serializeCookie({
      name: OAUTH_STATE_COOKIE,
      value: statePayload,
      maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
      httpOnly: true,
      secure: usesSecureCookies(environment),
    }));
    res.redirect(302, googleAuthorizationUrl({
      clientId: environment.GOOGLE_CLIENT_ID!,
      redirectUri: this.redirectUri(),
      state,
      nonce,
      codeChallenge,
    }));
  }

  /** Exchanges the code, verifies the ID Token, issues the app session cookie. */
  @Get('google/callback')
  @Public()
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');
    const environment = getEnvironment();
    const secure = usesSecureCookies(environment);
    const clearState = serializeCookie({
      name: OAUTH_STATE_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: true, secure,
    });
    const fail = (path: string) => {
      res.setHeader('Set-Cookie', clearState);
      res.redirect(302, path);
    };

    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) return fail(query.error === 'access_denied' ? '/?login=denied' : '/?login=failed');

    const stored = verifyOAuthState(parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE], environment.GOOGLE_CLIENT_SECRET);
    const now = Date.now();
    if (!stored || typeof query.code !== 'string' || typeof query.state !== 'string'
      || !query.code || !tokensEqual(stored.state, query.state)
      || stored.issuedAt > now || now - stored.issuedAt >= STATE_TTL_MS) {
      return fail('/?login=failed');
    }

    let session: Awaited<ReturnType<SessionService['issue']>>;
    try {
      const user = await this.google.authenticateWithCode(query.code, this.redirectUri(), {
        codeVerifier: stored.codeVerifier,
        nonce: stored.nonce,
      });
      session = await this.sessions.issue(user.id);
    } catch {
      return fail('/?login=failed');
    }

    const { token, expiresAt } = session;
    const maxAgeSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    res.setHeader('Set-Cookie', [
      serializeCookie({ name: SESSION_COOKIE, value: token, maxAgeSeconds, httpOnly: true, secure }),
      // Readable by the app so cookie-authenticated writes can echo it.
      serializeCookie({ name: CSRF_COOKIE, value: generateCsrfToken(), maxAgeSeconds, httpOnly: false, secure }),
      clearState,
    ]);
    res.redirect(302, safeRedirectPath(stored.redirectTo));
  }

  @Get('me')
  @Public()
  @Header('Cache-Control', 'no-store')
  async me(@Req() req: Request): Promise<{ user: SessionUser | null; csrfToken: string | null }> {
    const cookies = parseCookies(req.headers.cookie);
    const user = await this.sessions.resolve(cookies[SESSION_COOKIE]);
    if (!user) return { user: null, csrfToken: null };
    return { user, csrfToken: cookies[CSRF_COOKIE] ?? null };
  }

  /** Logout revokes the server-side session and clears both cookies. */
  @Post('logout')
  @Public()
  @Header('Cache-Control', 'no-store')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const environment = getEnvironment();
    const secure = usesSecureCookies(environment);
    const clear = serializeCookie({ name: OAUTH_STATE_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: true, secure });
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[SESSION_COOKIE]) assertCsrf(cookies[CSRF_COOKIE], req.headers[CSRF_HEADER]);
    await this.sessions.revoke(cookies[SESSION_COOKIE]);
    res.setHeader('Set-Cookie', [
      serializeCookie({ name: SESSION_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: true, secure }),
      serializeCookie({ name: CSRF_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: false, secure }),
      clear,
    ]);
    res.status(204).send();
  }

  private redirectUri(): string {
    const environment = getEnvironment();
    return `${environment.PUBLIC_BASE_URL!.replace(/\/$/, '')}/api/v1/auth/google/callback`;
  }

  private isConfigured(): boolean {
    const environment = getEnvironment();
    return Boolean(environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET && environment.PUBLIC_BASE_URL);
  }
}
