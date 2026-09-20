import { Module } from '@nestjs/common';
import { StageController } from './stage.controller.js';
import { StageService } from './stage.service.js';

@Module({ controllers: [StageController], providers: [StageService], exports: [StageService] })
export class StageModule {}
