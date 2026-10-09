import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads `.env` from the working directory if it exists.
 *
 * In production the variables are provided by systemd (EnvironmentFile), so a
 * missing file is not an error. Variables already set in the environment win.
 */
export function loadEnvFile(): void {
  const file = resolve(process.cwd(), '.env');
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}
