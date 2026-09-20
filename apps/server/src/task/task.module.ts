import { Module } from '@nestjs/common';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({ controllers: [TaskController], providers: [TaskService], exports: [TaskService] })
export class TaskModule {}
