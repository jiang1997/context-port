import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeyService } from './api-keys.service.js';
import { AuthController } from './auth.controller.js';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController, ApiKeysController],
  providers: [GoogleAuthService, SessionService, ApiKeyService],
  exports: [SessionService, ApiKeyService],
})
export class AuthModule {}
