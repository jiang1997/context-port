import { timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { getEnvironment, getAllowedOrigins } from '../config/environment.js';
import { identity, type AuthIdentity } from '../auth/auth-identity.js';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, parseCookies } from '../auth/auth.constants.js';
import { SessionService } from '../auth/session.service.js';
import { ApiKeyService, API_KEY_PREFIX } from '../auth/api-keys.service.js';

/** Browser session endpoints manage their own cookies and must stay public. */
const PUBLIC_PATH_PREFIXES = ['/health/', '/api/v1/auth/'];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class BusinessGuard implements CanActivate {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(ApiKeyService) private readonly apiKeys: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (PUBLIC_PATH_PREFIXES.some(prefix => req.path.startsWith(prefix))) return true;
    const env = getEnvironment();
    if (req.headers.origin && !getAllowedOrigins(env).includes(req.headers.origin)) throw new ForbiddenException('Origin is not allowed.');

    const identity = await this.resolveIdentity(req, env);
    if (!identity) {
      if (env.API_AUTH_ENABLED) throw new UnauthorizedException();
      const hostname = req.hostname;
      if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname)) throw new ForbiddenException('Host is not allowed.');
      req.authIdentity = { source: 'anonymous' };
      return true;
    }
    req.authIdentity = identity;
    return true;
  }

  /**
   * Resolves the request identity, preferring explicit credentials:
   * personal API key > legacy shared token > browser session cookie.
   * Returns undefined only in local dev without any credentials.
   */
  private async resolveIdentity(req: Request, env: ReturnType<typeof getEnvironment>): Promise<AuthIdentity | undefined> {
    const bearer = this.bearerToken(req);
    if (bearer) {
      if (bearer.startsWith(API_KEY_PREFIX)) {
        const userId = await this.apiKeys.resolve(bearer);
        if (!userId) throw new UnauthorizedException();
        return identity(userId, 'api-key');
      }
      if (env.API_AUTH_ENABLED) {
        if (!this.tokensMatch(bearer, env.API_AUTH_TOKEN)) throw new UnauthorizedException();
        // Transitional: the shared token stands for its bound owner, or keeps
        // pre-migration (anonymous) access until ownership is backfilled.
        return identity(env.API_AUTH_LEGACY_USER_ID, 'legacy-token');
      }
      // Local dev: unknown bearers are ignored; cookie/anonymous rules apply.
    }
    const user = await this.sessions.resolve(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    if (!user) return undefined;
    this.assertCsrf(req);
    return identity(user.id, 'session');
  }

  private bearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }

  private tokensMatch(actual: string, expected: string | undefined): boolean {
    if (!expected) return false;
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  /** Double-submit CSRF for cookie-authenticated writes (plan §1.5). */
  private assertCsrf(req: Request): void {
    if (SAFE_METHODS.has(req.method)) return;
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[CSRF_COOKIE] === undefined || req.headers[CSRF_HEADER] !== cookies[CSRF_COOKIE]) {
      throw new ForbiddenException('CSRF token is missing or invalid.');
    }
  }
}
