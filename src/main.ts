import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FileLoggerService } from './common/logger/file-logger.service';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case/snake-case.interceptor';
import { ResponseInterceptor } from './common/interceptors/response/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import * as express from 'express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const port = process.env.PORT ?? 3000;

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new FileLoggerService({
      json: process.env.NODE_ENV === 'production',
      colors: true,
    }),
  });

  app.setGlobalPrefix('adms');

  app.use(express.static(join(__dirname, '..', 'public')));
  app.useGlobalInterceptors(new SnakeCaseInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
});
