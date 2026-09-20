import { Module } from '@nestjs/common';
import { TagController } from './tag.controller.js';
import { TagService } from './tag.service.js';

@Module({ controllers: [TagController], providers: [TagService], exports: [TagService] })
export class TagModule {}
