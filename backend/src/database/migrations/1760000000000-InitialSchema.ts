import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. All tables carry the `todo_` prefix because they live in a
 * database that is shared with other applications.
 */
export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`todo_users\` (
        \`id\` char(36) NOT NULL,
        \`email\` varchar(254) NOT NULL,
        \`display_name\` varchar(100) NOT NULL,
        \`password_hash\` varchar(100) NULL,
        \`google_id\` varchar(64) NULL,
        \`avatar_url\` varchar(500) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`UQ_todo_users_email\` (\`email\`),
        UNIQUE INDEX \`UQ_todo_users_google_id\` (\`google_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`todo_sessions\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`token_hash\` char(64) NOT NULL,
        \`previous_token_hash\` char(64) NULL,
        \`rotated_at\` datetime(3) NULL,
        \`user_agent\` varchar(255) NULL,
        \`expires_at\` datetime(3) NOT NULL,
        \`last_used_at\` datetime(3) NOT NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`IDX_todo_sessions_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_todo_sessions_user\` FOREIGN KEY (\`user_id\`)
          REFERENCES \`todo_users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`todo_items\` (
        \`id\` char(36) NOT NULL,
        \`user_id\` char(36) NOT NULL,
        \`title\` varchar(500) NOT NULL,
        \`notes\` text NULL,
        \`done\` tinyint NOT NULL DEFAULT 0,
        \`due_date\` date NULL,
        \`position\` double NOT NULL DEFAULT 0,
        \`completed_at\` datetime(3) NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`IDX_todo_items_user_position\` (\`user_id\`, \`position\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_todo_items_user\` FOREIGN KEY (\`user_id\`)
          REFERENCES \`todo_users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `todo_items`');
    await queryRunner.query('DROP TABLE `todo_sessions`');
    await queryRunner.query('DROP TABLE `todo_users`');
  }
}
