import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AppConfig } from '../config/app-config.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AdminGuard } from './admin.guard.js';

const config = { adminEmails: ['boss@example.test'] } as AppConfig;
const user = (email: string, googleId: string | null) =>
  ({ id: email, email, googleId }) as User;

function service(users: User[]) {
  const repo = {
    findOne: async ({ where }: { where: { id: string } }) =>
      users.find((u) => u.id === where.id) ?? null,
    count: async () => users.length,
  };
  return new UsersService(repo as unknown as Repository<User>, config);
}

const contextFor = (sub?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ auth: sub ? { sub } : undefined }),
    }),
  }) as unknown as ExecutionContext;

describe('admin access', () => {
  it('requires both the listed email and a Google link', () => {
    const users = service([]);
    expect(users.isAdmin(user('boss@example.test', 'g-1'))).toBe(true);
    expect(users.isAdmin(user('BOSS@example.test', 'g-1'))).toBe(true);
    // Password account with the admin's address: not verified, no access.
    expect(users.isAdmin(user('boss@example.test', null))).toBe(false);
    expect(users.isAdmin(user('someone@example.test', 'g-2'))).toBe(false);
  });

  it('guard lets only admins through', async () => {
    const users = service([
      user('boss@example.test', 'g-1'),
      user('someone@example.test', 'g-2'),
    ]);
    const guard = new AdminGuard(users);
    await expect(
      guard.canActivate(contextFor('boss@example.test')),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor('someone@example.test')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(contextFor(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('counts all accounts', async () => {
    const users = service([user('a@x.test', null), user('b@x.test', 'g')]);
    await expect(users.count()).resolves.toBe(2);
  });
});
