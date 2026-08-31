import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('FINAGROW-Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const frontendUrl = configService.get<string>('frontendUrl') || 'http://localhost:3000';

  // 1. CORS Configuration for Frontend Origin
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === frontendUrl) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-organization-id',
      'x-entity-id',
    ],
  });

  // 2. Cookie Parser Middleware
  app.use(cookieParser());

  // 3. Global Request Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. Standardized Response Envelope Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // 5. Global Standardized Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  logger.log(`🚀 FINAGROW REST API server running securely on http://localhost:${port}`);
  logger.log(`📡 CORS configured for origin: ${frontendUrl}`);
}

bootstrap();
