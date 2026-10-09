import {
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig, loadConfig } from '../config/app-config.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleStrategy } from './google.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OneTimeCodes } from './one-time-codes.js';
import { Session } from './session.entity.js';
import { TokensService } from './tokens.service.js';

const CLEANUP_INTERVAL_MS = 6 * 60 * 60_000;

/** Removes expired sessions every few hours. */
@Injectable()
class SessionCleanup implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SessionCleanup.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly tokens: TokensService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.tokens
        .deleteExpiredSessions()
        .catch((error: unknown) =>
          this.logger.error('Session cleanup failed', error),
        );
    }, CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }
}

// The Google strategy needs credentials at construction time, so it is only
// registered when they are configured.
const googleProviders: Provider[] = loadConfig().google ? [GoogleStrategy] : [];

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([Session]),
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.secret,
        signOptions: { expiresIn: config.jwt.accessTtlSeconds },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    OneTimeCodes,
    JwtAuthGuard,
    SessionCleanup,
    ...googleProviders,
  ],
  exports: [TokensService, JwtAuthGuard],
})
export class AuthModule {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.google) {
      new Logger(AuthModule.name).warn(
        'GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL not set - Google login disabled',
      );
    }
  }
}
