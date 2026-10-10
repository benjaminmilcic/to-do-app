import type { DataSourceOptions } from 'typeorm';
import type { AppConfig } from '../config/app-config.js';
import { Session } from '../auth/session.entity.js';
import { Todo } from '../todos/todo.entity.js';
import { User } from '../users/user.entity.js';
import { InitialSchema1760000000000 } from './migrations/1760000000000-InitialSchema.js';
import { AddDueTime1760100000000 } from './migrations/1760100000000-AddDueTime.js';

export const ENTITIES = [User, Session, Todo];
export const MIGRATIONS = [InitialSchema1760000000000, AddDueTime1760100000000];

export function typeOrmOptions(config: AppConfig): DataSourceOptions {
  return {
    type: 'mysql',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    entities: ENTITIES,
    migrations: MIGRATIONS,
    // Own bookkeeping table so we never touch other apps' migration history.
    migrationsTableName: 'todo_migrations',
    // Pending migrations are applied on startup; schema sync stays off because
    // the database is shared with other applications.
    migrationsRun: true,
    synchronize: false,
  };
}
