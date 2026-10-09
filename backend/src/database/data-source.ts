import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadConfig } from '../config/app-config.js';
import { loadEnvFile } from '../config/load-env.js';
import { typeOrmOptions } from './typeorm-options.js';

// Used by the TypeORM CLI (npm run migration:run / migration:revert).
loadEnvFile();

export default new DataSource({
  ...typeOrmOptions(loadConfig()),
  migrationsRun: false,
});
