import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { AppConfigModule } from './config/config.module.js';
import { typeOrmOptions } from './database/typeorm-options.js';
import { HealthController } from './health/health.controller.js';
import { TodosModule } from './todos/todos.module.js';
import { TranscriptionModule } from './transcription/transcription.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => typeOrmOptions(config),
    }),
    // Generous default limit; credential endpoints are stricter (see
    // AuthController).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    UsersModule,
    AuthModule,
    TodosModule,
    TranscriptionModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
