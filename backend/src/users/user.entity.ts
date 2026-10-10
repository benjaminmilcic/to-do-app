import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'todo_users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  /** Null for accounts that only ever signed in with Google. */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 100,
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @Column({
    name: 'google_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  googleId: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}

/** Shape of a user as returned by the API. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  /** May see the admin statistics (see AppConfig.adminEmails). */
  isAdmin: boolean;
}
