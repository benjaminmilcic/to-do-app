import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PublicUser, User } from './user.entity.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Admins are listed in ADMIN_EMAILS and must be linked to Google: sign-up
   * does not verify email addresses, Google does.
   */
  isAdmin(user: User): boolean {
    return (
      Boolean(user.googleId) &&
      this.config.adminEmails.includes(normalizeEmail(user.email))
    );
  }

  /** Number of accounts ever created (accounts cannot be deleted). */
  count(): Promise<number> {
    return this.users.count();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  /** Includes the password hash, which is excluded from normal queries. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async hasPassword(id: string): Promise<boolean> {
    const row = await this.users
      .createQueryBuilder('user')
      .select('user.id')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    return Boolean(row?.passwordHash);
  }

  async createWithPassword(
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<User> {
    const normalized = normalizeEmail(email);
    if (await this.users.exists({ where: { email: normalized } })) {
      throw new ConflictException('An account with this email already exists');
    }
    return this.users.save(
      this.users.create({
        email: normalized,
        displayName: displayName.trim() || normalized.split('@')[0],
        passwordHash,
        googleId: null,
        avatarUrl: null,
      }),
    );
  }

  /**
   * Finds the user for a Google login. An existing password account with the
   * same (Google-verified) email address is linked instead of duplicated.
   */
  async upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    const byGoogleId = await this.users.findOne({
      where: { googleId: profile.googleId },
    });
    if (byGoogleId) {
      return byGoogleId;
    }

    const email = normalizeEmail(profile.email);
    const byEmail = await this.users.findOne({ where: { email } });
    if (byEmail) {
      byEmail.googleId = profile.googleId;
      byEmail.avatarUrl ??= profile.avatarUrl;
      return this.users.save(byEmail);
    }

    return this.users.save(
      this.users.create({
        email,
        displayName: profile.displayName || email.split('@')[0],
        passwordHash: null,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
      }),
    );
  }

  async toPublic(user: User): Promise<PublicUser> {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      hasPassword: await this.hasPassword(user.id),
      hasGoogle: Boolean(user.googleId),
      isAdmin: this.isAdmin(user),
    };
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
