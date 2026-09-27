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

    const identity = await this.resolveIdentity(req);
    if (!identity) throw new UnauthorizedException();
    req.authIdentity = identity;
    return true;
  }

  /**
   * Resolves the request identity from a personal API key or browser session.
   */
  private async resolveIdentity(req: Request): Promise<AuthIdentity | undefined> {
    const bearer = this.bearerToken(req);
    if (bearer) {
      if (bearer.startsWith(API_KEY_PREFIX)) {
        const userId = await this.apiKeys.resolve(bearer);
        if (!userId) throw new UnauthorizedException();
        return identity(userId, 'api-key');
      }
      throw new UnauthorizedException();
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

  /** Double-submit CSRF for cookie-authenticated writes (plan §1.5). */
  private assertCsrf(req: Request): void {
    if (SAFE_METHODS.has(req.method)) return;
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[CSRF_COOKIE] === undefined || req.headers[CSRF_HEADER] !== cookies[CSRF_COOKIE]) {
      throw new ForbiddenException('CSRF token is missing or invalid.');
    }
  }
}
