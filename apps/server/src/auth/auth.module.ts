import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController],
  providers: [GoogleAuthService, SessionService],
  exports: [SessionService],
})
export class AuthModule {}
