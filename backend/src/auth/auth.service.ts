import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { PublicUser } from '../users/user.entity.js';
import { type GoogleProfile, UsersService } from '../users/users.service.js';
import { OneTimeCodes } from './one-time-codes.js';
import { type TokenPair, TokensService } from './tokens.service.js';

const BCRYPT_ROUNDS = 12;

export interface AuthResult extends TokenPair {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so that a failed login takes
  // the same time whether or not the account exists.
  private readonly dummyHash = bcrypt.hashSync('timing-equalizer', BCRYPT_ROUNDS);

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly codes: OneTimeCodes,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string | undefined,
    userAgent: string | undefined,
  ): Promise<AuthResult> {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.users.createWithPassword(
      email,
      displayName ?? '',
      hash,
    );
    return this.startSession(user.id, userAgent);
  }

  async login(
    email: string,
    password: string,
    userAgent: string | undefined,
  ): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(email);
    const valid = await bcrypt.compare(
      password,
      user?.passwordHash ?? this.dummyHash,
    );
    if (!user || !user.passwordHash || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.startSession(user.id, userAgent);
  }

  /** Called from the OAuth callback: returns a code for the client. */
  async googleLoginCode(profile: GoogleProfile): Promise<string> {
    const user = await this.users.upsertGoogleUser(profile);
    return this.codes.issue(user.id);
  }

  async exchangeCode(
    code: string,
    userAgent: string | undefined,
  ): Promise<AuthResult> {
    const userId = this.codes.redeem(code);
    if (!userId) {
      throw new UnauthorizedException('Login code is invalid or expired');
    }
    return this.startSession(userId, userAgent);
  }

  refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.refresh(refreshToken, async (userId) => {
      const user = await this.users.findById(userId);
      return user?.email ?? null;
    });
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revoke(refreshToken);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.users.toPublic(user);
  }

  private async startSession(
    userId: string,
    userAgent: string | undefined,
  ): Promise<AuthResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    const tokens = await this.tokens.createSession(
      user.id,
      user.email,
      userAgent,
    );
    return { ...tokens, user: await this.users.toPublic(user) };
  }
}
