import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional time of day for the due date. */
export class AddDueTime1760100000000 implements MigrationInterface {
  name = 'AddDueTime1760100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `todo_items` ADD `due_time` time NULL AFTER `due_date`',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `todo_items` DROP COLUMN `due_time`');
  }
}
