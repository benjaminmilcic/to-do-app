import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import type { AppConfig } from '../config/app-config.js';
import type { Session } from './session.entity.js';
import { TokensService } from './tokens.service.js';

/** Minimal in-memory stand-in for the TypeORM repository. */
function fakeRepository() {
  const rows = new Map<string, Session>();
  let next = 0;
  return {
    rows,
    create: (data: Partial<Session>) => ({ ...data }) as Session,
    save: async (session: Session) => {
      session.id ??= `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`;
      rows.set(session.id, { ...session });
      return session;
    },
    findOne: async ({ where }: { where: { id: string } }) => {
      const row = rows.get(where.id);
      return row ? { ...row } : null;
    },
    delete: async ({ id }: { id: string }) => {
      rows.delete(id);
    },
  };
}

const config = {
  jwt: { secret: 'x'.repeat(32), accessTtlSeconds: 900 },
  refreshTtlDays: 90,
} as AppConfig;

describe('TokensService', () => {
  let repo: ReturnType<typeof fakeRepository>;
  let service: TokensService;
  const lookupEmail = async () => 'user@example.com';

  beforeEach(() => {
    repo = fakeRepository();
    service = new TokensService(
      config,
      new JwtService({ secret: config.jwt.secret, signOptions: { expiresIn: 900 } }),
      repo as unknown as Repository<Session>,
    );
  });

  it('issues a verifiable access token', async () => {
    const pair = await service.createSession('user-1', 'user@example.com', 'test');
    const payload = await service.verifyAccessToken(pair.accessToken);
    expect(payload.sub).toBe('user-1');
    expect(pair.refreshToken).toMatch(/^[0-9a-f-]{36}\.[\w-]+$/);
  });

  it('rotates the refresh token on every refresh', async () => {
    const first = await service.createSession('user-1', 'user@example.com', 'test');
    const second = await service.refresh(first.refreshToken, lookupEmail);
    const third = await service.refresh(second.refreshToken, lookupEmail);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(third.refreshToken).not.toBe(second.refreshToken);
  });

  it('accepts the previous token within the grace period (parallel tabs)', async () => {
    const first = await service.createSession('user-1', 'user@example.com', 'test');
    await service.refresh(first.refreshToken, lookupEmail);
    await expect(
      service.refresh(first.refreshToken, lookupEmail),
    ).resolves.toBeDefined();
  });

  it('revokes the session when an old token is replayed after the grace period', async () => {
    const first = await service.createSession('user-1', 'user@example.com', 'test');
    const second = await service.refresh(first.refreshToken, lookupEmail);
    const sessionId = first.refreshToken.split('.')[0];
    repo.rows.get(sessionId)!.rotatedAt = new Date(Date.now() - 5 * 60_000);

    await expect(
      service.refresh(first.refreshToken, lookupEmail),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    // The whole session is gone, including the newest token.
    await expect(
      service.refresh(second.refreshToken, lookupEmail),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired sessions and malformed tokens', async () => {
    const pair = await service.createSession('user-1', 'user@example.com', 'test');
    const sessionId = pair.refreshToken.split('.')[0];
    repo.rows.get(sessionId)!.expiresAt = new Date(Date.now() - 1000);

    await expect(service.refresh(pair.refreshToken, lookupEmail)).rejects.toThrow();
    await expect(service.refresh('garbage', lookupEmail)).rejects.toThrow();
  });

  it('ends the session on logout', async () => {
    const pair = await service.createSession('user-1', 'user@example.com', 'test');
    await service.revoke(pair.refreshToken);
    await expect(service.refresh(pair.refreshToken, lookupEmail)).rejects.toThrow();
  });
});
