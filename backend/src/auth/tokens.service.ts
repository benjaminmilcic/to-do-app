import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { Session } from './session.entity.js';

/** How long the previous refresh token stays valid after a rotation. */
const ROTATION_GRACE_MS = 60_000;

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  /** Lifetime of the access token in seconds. */
  expiresIn: number;
  refreshToken: string;
}

@Injectable()
export class TokensService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwt: JwtService,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  /** Starts a new session (= new device / browser) for the user. */
  async createSession(
    userId: string,
    email: string,
    userAgent: string | undefined,
  ): Promise<TokenPair> {
    const secret = newSecret();
    const now = new Date();
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        tokenHash: hash(secret),
        previousTokenHash: null,
        rotatedAt: null,
        userAgent: userAgent?.slice(0, 255) ?? null,
        expiresAt: this.refreshExpiry(now),
        lastUsedAt: now,
      }),
    );
    return this.issue(session, email, secret);
  }

  /**
   * Validates a refresh token and rotates it. The returned pair replaces the
   * one the client had before. `lookupEmail` resolves the user's current
   * email and returns null if the user was deleted.
   */
  async refresh(
    refreshToken: string,
    lookupEmail: (userId: string) => Promise<string | null>,
  ): Promise<TokenPair> {
    const { sessionId, secret } = parseRefreshToken(refreshToken);
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    const presented = hash(secret);
    const isCurrent = safeEqual(presented, session.tokenHash);
    const isRecentPrevious =
      !isCurrent &&
      session.previousTokenHash !== null &&
      safeEqual(presented, session.previousTokenHash) &&
      session.rotatedAt !== null &&
      Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;

    if (!isCurrent && !isRecentPrevious) {
      // An old token was replayed: treat the session as compromised.
      await this.sessions.delete({ id: session.id });
      throw new UnauthorizedException('Session revoked');
    }

    const email = await lookupEmail(session.userId);
    if (!email) {
      await this.sessions.delete({ id: session.id });
      throw new UnauthorizedException('User no longer exists');
    }

    const nextSecret = newSecret();
    const now = new Date();
    if (isCurrent) {
      session.previousTokenHash = session.tokenHash;
    }
    session.tokenHash = hash(nextSecret);
    session.rotatedAt = now;
    session.lastUsedAt = now;
    session.expiresAt = this.refreshExpiry(now);
    await this.sessions.save(session);

    return this.issue(session, email, nextSecret);
  }

  /** Ends the session belonging to the given refresh token (logout). */
  async revoke(refreshToken: string): Promise<void> {
    try {
      const { sessionId } = parseRefreshToken(refreshToken);
      await this.sessions.delete({ id: sessionId });
    } catch {
      // Logging out with a malformed token is not worth reporting.
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
  }

  private async issue(
    session: Session,
    email: string,
    secret: string,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: session.userId,
      sid: session.id,
      email,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresIn: this.config.jwt.accessTtlSeconds,
      refreshToken: `${session.id}.${secret}`,
    };
  }

  private refreshExpiry(from: Date): Date {
    return new Date(from.getTime() + this.config.refreshTtlDays * 86_400_000);
  }
}

function newSecret(): string {
  return randomBytes(32).toString('base64url');
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseRefreshToken(token: string): {
  sessionId: string;
  secret: string;
} {
  const [sessionId, secret] = token.split('.');
  if (!sessionId || !secret || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    throw new UnauthorizedException('Malformed refresh token');
  }
  return { sessionId, secret };
}
