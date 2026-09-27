import { timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { getEnvironment, getAllowedOrigins } from '../config/environment.js';

/** Browser session endpoints manage their own cookies and must stay public. */
const PUBLIC_PATH_PREFIXES = ['/health/', '/api/v1/auth/'];

@Injectable()
export class BusinessGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (PUBLIC_PATH_PREFIXES.some(prefix => req.path.startsWith(prefix))) return true;
    const env = getEnvironment();
    if (req.headers.origin && !getAllowedOrigins(env).includes(req.headers.origin)) throw new ForbiddenException('Origin is not allowed.');
    if (!env.API_AUTH_ENABLED) {
      const hostname = req.hostname;
      if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname)) throw new ForbiddenException('Host is not allowed.');
      return true;
    }
    const actual = Buffer.from(req.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${env.API_AUTH_TOKEN}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException();
    return true;
  }
}
