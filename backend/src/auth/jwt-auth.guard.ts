import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { type AccessTokenPayload, TokensService } from './tokens.service.js';

type AuthedRequest = Request & { auth?: AccessTokenPayload };

/** Requires a valid `Authorization: Bearer <access token>` header. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing access token');
    }
    request.auth = await this.tokens.verifyAccessToken(token);
    return true;
  }
}

/** Injects the payload of the verified access token. */
export const Auth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (!request.auth) {
      throw new UnauthorizedException();
    }
    return request.auth;
  },
);
