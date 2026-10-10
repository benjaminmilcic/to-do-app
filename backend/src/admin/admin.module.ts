import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
