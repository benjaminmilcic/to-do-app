import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import type { GoogleProfile } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import {
  ExchangeCodeDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto.js';
import {
  GoogleAuthGuard,
  type LoginPlatform,
  verifyOAuthState,
} from './google-auth.guard.js';
import { Auth, JwtAuthGuard } from './jwt-auth.guard.js';
import { OAuthErrorFilter } from './oauth-error.filter.js';
import type { AccessTokenPayload } from './tokens.service.js';

// Brute-force protection for everything that checks credentials.
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('register')
  @Throttle(STRICT)
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.register(
      dto.email,
      dto.password,
      dto.displayName,
      userAgent,
    );
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(STRICT)
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.login(dto.email, dto.password, userAgent);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Auth() auth: AccessTokenPayload) {
    return this.auth.me(auth.sub);
  }

  /** Entry point of the Google login; `?platform=native` for the Android app. */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleStart(): void {
    // The guard redirects to Google.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthErrorFilter)
  async googleCallback(
    @Req() request: Request & { user?: GoogleProfile },
    @Res() response: Response,
  ): Promise<void> {
    const platform = verifyOAuthState(request, response);
    if (!platform || !request.user) {
      response.redirect(this.callbackUrl(platform ?? 'web', { error: 'state' }));
      return;
    }
    const code = await this.auth.googleLoginCode(request.user);
    response.redirect(this.callbackUrl(platform, { code }));
  }

  @Post('google/exchange')
  @HttpCode(200)
  @Throttle(STRICT)
  exchange(
    @Body() dto: ExchangeCodeDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.exchangeCode(dto.code, userAgent);
  }

  /** Where the browser is sent after Google: the PWA or the native app. */
  private callbackUrl(
    platform: LoginPlatform,
    params: Record<string, string>,
  ): string {
    const query = new URLSearchParams(params).toString();
    return platform === 'native'
      ? `${this.config.appScheme}://auth/callback?${query}`
      : `${this.config.frontendUrl}/auth/callback?${query}`;
  }
}
