import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

/**
 * Origin of the backend. The web app is served by (or proxied to) the same
 * origin as the API, the native app has to use an absolute URL.
 */
export const API_ORIGIN = Capacitor.isNativePlatform()
  ? environment.nativeApiOrigin
  : '';

export const API_URL = `${API_ORIGIN}/api`;

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
}

export interface TokenPair {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: PublicUser;
}

export interface ClientConfig {
  googleLogin: boolean;
  apkUrl: string | null;
}

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  done: boolean;
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
