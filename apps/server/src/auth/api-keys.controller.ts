import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe.js';
import { ApiKeyService } from './api-keys.service.js';
import type { AuthIdentity } from './auth-identity.js';
import { SessionOnly } from './auth-policy.decorator.js';
import { RequestIdentity } from './request-identity.decorator.js';

const CreateKeySchema = z.object({ name: z.string().min(1).max(100) });

@Controller('api/v1/auth/keys')
@SessionOnly()
export class ApiKeysController {
  constructor(@Inject(ApiKeyService) private readonly keys: ApiKeyService) {}

  @Post()
  async create(@RequestIdentity() { userId }: AuthIdentity, @Body(new ZodValidationPipe(CreateKeySchema)) body: { name: string }) {
    const created = await this.keys.issue(userId, body.name);
    return { id: created.id, name: created.name, createdAt: created.createdAt, key: created.key };
  }

  @Get()
  async list(@RequestIdentity() { userId }: AuthIdentity) {
    return this.keys.list(userId);
  }

  @Post(':keyId/revoke')
  @HttpCode(204)
  async revoke(@RequestIdentity() { userId }: AuthIdentity, @Param('keyId', new ParseUUIDPipe()) keyId: string) {
    const revoked = await this.keys.revoke(userId, keyId);
    if (!revoked) throw new ForbiddenException('Key not found or already revoked.');
  }
}
