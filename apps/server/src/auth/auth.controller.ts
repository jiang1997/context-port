import { Controller, ForbiddenException, Get, Header, Post, Inject, Req, Res } from '@nestjs/common';
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
  googleAuthorizationUrl,
  parseCookies,
  safeRedirectPath,
  serializeCookie,
} from './auth.constants.js';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService, type SessionUser } from './session.service.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(GoogleAuthService) private readonly google: GoogleAuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  /** Starts the authorization-code flow, carrying `state` and the intended redirect. */
  @Get('google/start')
  start(@Req() req: Request, @Res() res: Response): void {
    res.setHeader('Cache-Control', 'no-store');
    if (!this.isConfigured()) {
      res.status(503).json({ code: 'AUTH_NOT_CONFIGURED', message: 'Google login is not configured.' });
      return;
    }
    const environment = getEnvironment();
    const state = generateOAuthState();
    const redirectTo = safeRedirectPath(typeof req.query.redirect === 'string' ? req.query.redirect : undefined);
    const statePayload = JSON.stringify({ state, redirectTo, issuedAt: Date.now() });
    // The cookie binds the state returned by Google to this browser.
    res.setHeader('Set-Cookie', serializeCookie({
      name: OAUTH_STATE_COOKIE,
      value: encodeURIComponent(statePayload),
      maxAgeSeconds: Math.floor(STATE_TTL_MS / 1000),
      httpOnly: true,
      secure: usesSecureCookies(environment),
    }));
    res.redirect(302, googleAuthorizationUrl({
      clientId: environment.GOOGLE_CLIENT_ID!,
      redirectUri: this.redirectUri(),
      state,
    }));
  }

  /** Exchanges the code, verifies the ID Token, issues the app session cookie. */
  @Get('google/callback')
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

    const stored = this.readStateCookie(parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE]);
    if (!stored || typeof query.code !== 'string' || typeof query.state !== 'string'
      || !query.code || !query.state || query.state !== stored.state
      || stored.issuedAt > Date.now() || Date.now() - stored.issuedAt >= STATE_TTL_MS) {
      return fail('/?login=failed');
    }

    let session: Awaited<ReturnType<SessionService['issue']>>;
    try {
      const user = await this.google.authenticateWithCode(query.code, this.redirectUri());
      session = await this.sessions.issue(user.id);
    } catch {
      return fail('/contexts?login=failed');
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
  @Header('Cache-Control', 'no-store')
  async me(@Req() req: Request): Promise<{ user: SessionUser | null; csrfToken: string | null }> {
    const cookies = parseCookies(req.headers.cookie);
    const user = await this.sessions.resolve(cookies[SESSION_COOKIE]);
    if (!user) return { user: null, csrfToken: null };
    return { user, csrfToken: cookies[CSRF_COOKIE] ?? null };
  }

  /** Logout revokes the server-side session and clears both cookies. */
  @Post('logout')
  @Header('Cache-Control', 'no-store')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const environment = getEnvironment();
    const secure = usesSecureCookies(environment);
    const clear = serializeCookie({ name: OAUTH_STATE_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: true, secure });
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[SESSION_COOKIE] && (!cookies[CSRF_COOKIE] || req.headers[CSRF_HEADER] !== cookies[CSRF_COOKIE])) {
      throw new ForbiddenException('CSRF token is missing or invalid.');
    }
    await this.sessions.revoke(cookies[SESSION_COOKIE]);
    res.setHeader('Set-Cookie', [
      serializeCookie({ name: SESSION_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: true, secure }),
      serializeCookie({ name: CSRF_COOKIE, value: '', maxAgeSeconds: 0, httpOnly: false, secure }),
      clear,
    ]);
    res.status(204).send();
  }

  private readStateCookie(value: string | undefined): { state: string; redirectTo: string; issuedAt: number } | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as { state?: unknown; redirectTo?: unknown; issuedAt?: unknown };
      if (typeof parsed.state !== 'string' || !parsed.state || typeof parsed.redirectTo !== 'string'
        || typeof parsed.issuedAt !== 'number' || !Number.isFinite(parsed.issuedAt)) return null;
      return { state: parsed.state, redirectTo: parsed.redirectTo, issuedAt: parsed.issuedAt };
    } catch {
      return null;
    }
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
