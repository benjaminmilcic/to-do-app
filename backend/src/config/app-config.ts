/**
 * Central, typed access to environment variables.
 *
 * All values come from the process environment. Locally they are loaded from
 * `backend/.env`; on the server systemd injects them from a private env file
 * (see `deploy/todo-app.env.example`). Nothing secret lives in the repository.
 */
export interface AppConfig {
  isProduction: boolean;
  host: string;
  port: number;
  /** Public base URL of the web frontend, e.g. https://todo-app.example.com */
  frontendUrl: string;
  /** Allowed CORS origins (web dev server, Capacitor WebView, ...). */
  corsOrigins: string[];
  /** Custom URL scheme of the native app, used for the Google login deep link. */
  appScheme: string;
  /** Public URL of the APK download, shown in the web app (optional). */
  apkUrl: string | null;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  jwt: {
    secret: string;
    accessTtlSeconds: number;
  };
  refreshTtlDays: number;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  } | null;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV?.trim() === 'production';

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const googleClientId = optional('GOOGLE_CLIENT_ID');
  const googleClientSecret = optional('GOOGLE_CLIENT_SECRET');
  const googleCallbackUrl = optional('GOOGLE_CALLBACK_URL');

  return {
    isProduction,
    host: process.env.HOST?.trim() || '127.0.0.1',
    port: Number(process.env.PORT ?? 3100),
    frontendUrl: (optional('FRONTEND_URL') ?? 'http://localhost:8100').replace(
      /\/+$/,
      '',
    ),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    appScheme: optional('APP_SCHEME') ?? 'dev.benjaminmilcic.todo',
    apkUrl: optional('APK_URL'),
    db: {
      host: required('DB_HOST'),
      port: Number(process.env.DB_PORT ?? 3306),
      user: required('DB_USER'),
      password: required('DB_PASS'),
      name: required('DB_NAME'),
    },
    jwt: {
      secret: jwtSecret,
      accessTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    },
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 90),
    // Google login is optional so that self-hosters can run the app without it.
    google:
      googleClientId && googleClientSecret && googleCallbackUrl
        ? {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            callbackUrl: googleCallbackUrl,
          }
        : null,
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
