import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth/tokens.service.js';
import { UsersService } from '../users/users.service.js';

/**
 * Only lets admins through (see UsersService.isAdmin). Must run after
 * JwtAuthGuard. Checks the database on every request, so removing someone
 * from ADMIN_EMAILS takes effect immediately.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { auth?: AccessTokenPayload }>();
    const user = request.auth
      ? await this.users.findById(request.auth.sub)
      : null;
    if (!user || !this.users.isAdmin(user)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
