import { randomBytes } from 'node:crypto';
import {
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export type LoginPlatform = 'web' | 'native';

export const OAUTH_STATE_COOKIE = 'todo_oauth_state';
const STATE_COOKIE_PATH = '/api/auth/google';

/**
 * Starts the Google OAuth flow and handles its callback.
 *
 * On start, a random nonce is stored in a short-lived cookie and sent to Google
 * inside `state` (`<platform>.<nonce>`). The callback only accepts a state whose
 * nonce matches the cookie, which prevents login CSRF.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.google) {
      throw new NotFoundException('Google login is not configured');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path.endsWith('/callback')) {
      return { session: false };
    }

    const platform: LoginPlatform =
      request.query.platform === 'native' ? 'native' : 'web';
    const nonce = randomBytes(16).toString('base64url');
    context
      .switchToHttp()
      .getResponse<Response>()
      .cookie(OAUTH_STATE_COOKIE, nonce, {
        httpOnly: true,
        secure: this.config.isProduction,
        sameSite: 'lax',
        path: STATE_COOKIE_PATH,
        maxAge: 10 * 60_000,
      });

    return {
      session: false,
      prompt: 'select_account',
      state: `${platform}.${nonce}`,
    };
  }
}

/** Parses `state` from the callback and checks it against the cookie. */
export function verifyOAuthState(
  request: Request,
  response: Response,
): LoginPlatform | null {
  const state = typeof request.query.state === 'string' ? request.query.state : '';
  const [platform, nonce] = state.split('.');
  const cookieNonce = readCookie(request, OAUTH_STATE_COOKIE);
  response.clearCookie(OAUTH_STATE_COOKIE, { path: STATE_COOKIE_PATH });

  if (!nonce || !cookieNonce || nonce !== cookieNonce) {
    return null;
  }
  return platform === 'native' ? 'native' : 'web';
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return null;
}
