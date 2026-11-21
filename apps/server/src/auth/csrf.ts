import { ForbiddenException } from '@nestjs/common';
import { tokensEqual } from './auth.constants.js';

export function assertCsrf(cookie: string | undefined, header: string | string[] | undefined): void {
  if (!cookie || typeof header !== 'string' || !tokensEqual(cookie, header)) {
    throw new ForbiddenException('CSRF token is missing or invalid.');
  }
}
