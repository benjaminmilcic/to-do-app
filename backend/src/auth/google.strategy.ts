import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { GoogleProfile } from '../users/users.service.js';

/**
 * Only registered when Google credentials are configured (see AuthModule).
 * The strategy runs without sessions; the user's platform (web or native app)
 * travels through the OAuth `state` parameter.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const google = config.google!;
    super({
      clientID: google.clientId,
      clientSecret: google.clientSecret,
      callbackURL: google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.find((e) => e.verified)?.value;
    if (!email) {
      done(new Error('Google account has no verified email address'));
      return;
    }
    const user: GoogleProfile = {
      googleId: profile.id,
      email,
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
