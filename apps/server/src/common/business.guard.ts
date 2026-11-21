import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { getEnvironment, getAllowedOrigins } from '../config/environment.js';
import { identity, type AuthIdentity } from '../auth/auth-identity.js';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, parseCookies } from '../auth/auth.constants.js';
import { SessionService } from '../auth/session.service.js';
import { ApiKeyService, API_KEY_PREFIX } from '../auth/api-keys.service.js';
import { AUTH_POLICY, type AuthPolicy } from '../auth/auth-policy.decorator.js';
import { assertCsrf } from '../auth/csrf.js';
import { isTemporaryContextPath } from '../temporary-context/temporary-context.paths.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const clipboardRequests = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class BusinessGuard implements CanActivate {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(ApiKeyService) private readonly apiKeys: ApiKeyService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (isTemporaryContextPath(req.path)) {
      const now = Date.now();
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      const current = clipboardRequests.get(ip);
      const next = current && current.resetAt > now ? current : { count: 0, resetAt: now + 60_000 };
      next.count += 1;
      clipboardRequests.set(ip, next);
      if (next.count > 60) throw new ForbiddenException({
        code: 'TEMPORARY_CONTEXT_RATE_LIMITED', message: 'Too many temporary context requests. Try again shortly.',
      });
      if (clipboardRequests.size > 10_000) for (const [key, value] of clipboardRequests) if (value.resetAt <= now) clipboardRequests.delete(key);
      return true;
    }

    const env = getEnvironment();
    if (req.headers.origin && !getAllowedOrigins(env).includes(req.headers.origin)) throw new ForbiddenException('Origin is not allowed.');

    const policy = this.reflector.getAllAndOverride<AuthPolicy | undefined>(AUTH_POLICY, [context.getHandler(), context.getClass()]);
    if (policy === 'public') return true;

    const identity = await this.resolveIdentity(req, policy === 'session');
    if (!identity) throw new UnauthorizedException();
    req.authIdentity = identity;
    return true;
  }

  /**
   * Resolves the request identity from a personal API key or browser session.
   */
  private async resolveIdentity(req: Request, sessionOnly: boolean): Promise<AuthIdentity | undefined> {
    const bearer = sessionOnly ? undefined : this.bearerToken(req);
    if (bearer) {
      if (bearer.startsWith(API_KEY_PREFIX)) {
        const userId = await this.apiKeys.resolve(bearer);
        if (!userId) throw new UnauthorizedException();
        return identity(userId, 'api-key');
      }
      throw new UnauthorizedException();
    }
    const cookies = parseCookies(req.headers.cookie);
    const user = await this.sessions.resolve(cookies[SESSION_COOKIE]);
    if (!user) return undefined;
    if (!SAFE_METHODS.has(req.method)) assertCsrf(cookies[CSRF_COOKIE], req.headers[CSRF_HEADER]);
    return identity(user.id, 'session');
  }

  private bearerToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }
}
