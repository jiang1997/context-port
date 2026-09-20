import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { getEnvironment } from './config/environment.js';

async function bootstrap() {
  const environment = getEnvironment();
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: environment.WEB_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
  });
  app.enableShutdownHooks();

  await app.listen(environment.PORT, environment.HOST);
  Logger.log(
    `Server listening on http://${environment.HOST}:${environment.PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
