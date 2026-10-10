import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';
import { AdminGuard } from './admin.guard.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly users: UsersService) {}

  /** Numbers for the admin entry in the account menu. */
  @Get('stats')
  async stats(): Promise<{ users: number }> {
    return { users: await this.users.count() };
  }
}
