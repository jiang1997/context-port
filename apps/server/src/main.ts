import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { getEnvironment } from './config/environment.js';
import { createCorsOptions } from './config/cors.js';

async function bootstrap() {
  const environment = getEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.useBodyParser('json', { limit: '1mb' });
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors(createCorsOptions(environment));
  app.enableShutdownHooks();

  await app.listen(environment.PORT, environment.HOST);
  Logger.log(
    `Server listening on http://${environment.HOST}:${environment.PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
