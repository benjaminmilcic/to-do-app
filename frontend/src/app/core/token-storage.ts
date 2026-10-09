import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { PublicUser } from './api';

const REFRESH_KEY = 'todo.refreshToken';
const USER_KEY = 'todo.user';

/**
 * Persists the session so that the user stays signed in across app restarts.
 * Capacitor Preferences uses SharedPreferences on Android and localStorage in
 * the browser.
 *
 * The short-lived access token is only kept in memory. The user profile is
 * cached so that the app can start while offline.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_KEY });
    return value;
  }

  async setRefreshToken(token: string): Promise<void> {
    await Preferences.set({ key: REFRESH_KEY, value: token });
  }

  async getUser(): Promise<PublicUser | null> {
    const { value } = await Preferences.get({ key: USER_KEY });
    try {
      return value ? (JSON.parse(value) as PublicUser) : null;
    } catch {
      return null;
    }
  }

  async setUser(user: PublicUser): Promise<void> {
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: REFRESH_KEY });
    await Preferences.remove({ key: USER_KEY });
  }
}
