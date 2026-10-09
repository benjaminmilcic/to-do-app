import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dataSource: DataSource,
  ) {}

  /** Used by the deploy workflow and for monitoring. */
  @Get('health')
  async health() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }

  /** Public client configuration, fetched by the app on startup. */
  @Get('config')
  clientConfig() {
    return {
      googleLogin: this.config.google !== null,
      apkUrl: this.config.apkUrl,
    };
  }
}
