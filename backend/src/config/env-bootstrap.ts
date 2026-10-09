// Imported first by main.ts: loads .env before any module reads process.env.
import { loadEnvFile } from './load-env.js';

loadEnvFile();
