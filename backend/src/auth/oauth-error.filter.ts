import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

/**
 * The OAuth callback is opened by the browser, not by our client code. Instead
 * of showing a JSON error page (e.g. when the user cancels at Google), send the
 * user back to the app with an error flag.
 */
@Catch()
export class OAuthErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthErrorFilter.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    this.logger.warn(
      `Google login failed: ${exception instanceof Error ? exception.message : String(exception)}`,
    );

    const state =
      typeof request.query.state === 'string' ? request.query.state : '';
    const query = new URLSearchParams({ error: 'google' }).toString();
    response.redirect(
      state.startsWith('native.')
        ? `${this.config.appScheme}://auth/callback?${query}`
        : `${this.config.frontendUrl}/auth/callback?${query}`,
    );
  }
}
