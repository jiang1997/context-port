import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, parseCookies } from './auth.constants.js';
import { ApiKeyService } from './api-keys.service.js';
import { SessionService } from './session.service.js';

const CreateKeySchema = z.object({ name: z.string().min(1).max(100) });

/**
 * Key management for browser sessions (plan §4: create/list/revoke with the
 * raw key shown once). The guard skips /api/v1/auth/*, so this controller
 * resolves its own session and enforces CSRF for writes.
 */
@Controller('api/v1/auth/keys')
export class ApiKeysController {
  constructor(
    @Inject(ApiKeyService) private readonly keys: ApiKeyService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Post()
  async create(@Req() req: Request, @Body(new ZodValidationPipe(CreateKeySchema)) body: { name: string }) {
    const user = await this.requireSession(req);
    this.assertCsrf(req);
    const created = await this.keys.issue(user.id, body.name);
    return { id: created.id, name: created.name, createdAt: created.createdAt, key: created.key };
  }

  @Get()
  async list(@Req() req: Request) {
    const user = await this.requireSession(req);
    return this.keys.list(user.id);
  }

  @Post(':keyId/revoke')
  @HttpCode(204)
  async revoke(@Req() req: Request, @Param('keyId', new ParseUUIDPipe()) keyId: string) {
    const user = await this.requireSession(req);
    this.assertCsrf(req);
    const revoked = await this.keys.revoke(user.id, keyId);
    if (!revoked) throw new ForbiddenException('Key not found or already revoked.');
    return;
  }

  private async requireSession(req: Request) {
    const user = await this.sessions.resolve(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private assertCsrf(req: Request): void {
    const cookies = parseCookies(req.headers.cookie);
    if (!cookies[CSRF_COOKIE] || req.headers[CSRF_HEADER] !== cookies[CSRF_COOKIE]) {
      throw new ForbiddenException('CSRF token is missing or invalid.');
    }
  }
}
