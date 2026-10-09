import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One row per signed-in device / browser.
 *
 * The refresh token handed to the client has the form `<id>.<secret>`; only a
 * SHA-256 hash of the secret is stored. Tokens are rotated on every refresh.
 */
@Entity({ name: 'todo_sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  /**
   * Hash of the previous token. It stays valid for a short grace period after
   * a rotation so that two tabs refreshing at the same time do not log each
   * other out.
   */
  @Column({
    name: 'previous_token_hash',
    type: 'char',
    length: 64,
    nullable: true,
  })
  previousTokenHash: string | null;

  @Column({ name: 'rotated_at', type: 'datetime', precision: 3, nullable: true })
  rotatedAt: Date | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'datetime', precision: 3 })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
