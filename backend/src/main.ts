// Must stay the first import: loads .env before any module reads process.env.
import './config/env-bootstrap.js';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { loadConfig } from './config/app-config.js';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: config.isProduction
      ? ['log', 'warn', 'error']
      : ['log', 'warn', 'error', 'debug'],
  });

  // Apache runs on the same machine and forwards the client IP (which it got
  // from Cloudflare). Needed for rate limiting by IP.
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // In production the web app is served from the same origin; only the
  // Android WebView (https://localhost) needs CORS. In development every
  // origin is mirrored for convenience.
  app.enableCors({
    origin: config.isProduction ? config.corsOrigins : true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Socket-Id'],
    maxAge: 600,
  });

  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  new Logger('Bootstrap').log(
    `API listening on http://${config.host}:${config.port}/api ` +
      `(${config.isProduction ? 'production' : 'development'})`,
  );
}

await bootstrap();
