import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import {
  API_URL,
  type AuthResult,
  type PublicUser,
  type TokenPair,
} from './api';
import { TokenStorage } from './token-storage';

/** Refresh a little before the access token actually expires. */
const EXPIRY_MARGIN_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorage);

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private refreshInFlight: Promise<string | null> | null = null;

  private readonly _user = signal<PublicUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  /** Resolves once the stored session was restored (or found missing). */
  readonly ready: Promise<void>;

  /** Called by other services (sync, todos) when the user signs out. */
  private readonly logoutHandlers: (() => void)[] = [];

  constructor() {
    this.ready = this.restoreSession();
    this.listenForNativeLoginRedirect();
  }

  onLogout(handler: () => void): void {
    this.logoutHandlers.push(handler);
  }

  async login(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${API_URL}/auth/login`, { email, password }),
    );
    await this.applyAuthResult(result);
  }

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${API_URL}/auth/register`, {
        email,
        password,
        displayName: displayName || undefined,
      }),
    );
    await this.applyAuthResult(result);
  }

  /**
   * Starts the Google login. The web app navigates away and comes back to
   * /auth/callback; the native app opens the system browser and is reopened
   * through its custom URL scheme.
   */
  async loginWithGoogle(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: `${API_URL}/auth/google?platform=native` });
    } else {
      window.location.href = `${API_URL}/auth/google`;
    }
  }

  /** Exchanges the one-time code from the Google redirect for tokens. */
  async completeGoogleLogin(code: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${API_URL}/auth/google/exchange`, { code }),
    );
    await this.applyAuthResult(result);
  }

  async logout(): Promise<void> {
    const refreshToken = await this.storage.getRefreshToken();
    this.clearLocalSession();
    await this.storage.clear();
    if (refreshToken) {
      // Best effort: the local session is gone either way.
      this.http
        .post(`${API_URL}/auth/logout`, { refreshToken })
        .subscribe({ error: () => undefined });
    }
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /**
   * Returns a valid access token, refreshing it if necessary. Returns null
   * when the session has ended (the user is then sent to the login page).
   */
  async getAccessToken(): Promise<string | null> {
    if (
      this.accessToken &&
      Date.now() < this.accessTokenExpiresAt - EXPIRY_MARGIN_MS
    ) {
      return this.accessToken;
    }
    return this.refreshAccessToken();
  }

  /** Forces a token refresh, e.g. after the API answered 401. */
  refreshAccessToken(): Promise<string | null> {
    this.refreshInFlight ??= this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<string | null> {
    // Several tabs share one refresh token. Serialize the refresh across tabs
    // so that no tab uses a token another tab has just rotated.
    const run = () => this.refreshWithStoredToken();
    return typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('todo-auth-refresh', run)
      : run();
  }

  private async refreshWithStoredToken(): Promise<string | null> {
    const refreshToken = await this.storage.getRefreshToken();
    if (!refreshToken) {
      await this.handleSessionEnded();
      return null;
    }
    try {
      const tokens = await firstValueFrom(
        this.http.post<TokenPair>(`${API_URL}/auth/refresh`, { refreshToken }),
      );
      await this.applyTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        await this.storage.clear();
        await this.handleSessionEnded();
        return null;
      }
      // Network problem: keep the session, try again later.
      throw error;
    }
  }

  private async restoreSession(): Promise<void> {
    if (!(await this.storage.getRefreshToken())) {
      return;
    }
    try {
      if (!(await this.refreshAccessToken())) {
        return;
      }
      await this.setUser(
        await firstValueFrom(this.http.get<PublicUser>(`${API_URL}/auth/me`)),
      );
    } catch {
      // Offline at startup: the session cannot be verified right now. Start
      // with the cached profile; requests refresh the token once the network
      // is back, and a revoked session still ends up on the login page.
      this._user.set(await this.storage.getUser());
    }
  }

  private async applyAuthResult(result: AuthResult): Promise<void> {
    await this.applyTokens(result);
    await this.setUser(result.user);
  }

  private async setUser(user: PublicUser): Promise<void> {
    this._user.set(user);
    await this.storage.setUser(user);
  }

  private async applyTokens(tokens: TokenPair): Promise<void> {
    this.accessToken = tokens.accessToken;
    this.accessTokenExpiresAt = Date.now() + tokens.expiresIn * 1000;
    await this.storage.setRefreshToken(tokens.refreshToken);
  }

  private async handleSessionEnded(): Promise<void> {
    const wasLoggedIn = this._user() !== null;
    this.clearLocalSession();
    if (wasLoggedIn) {
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private clearLocalSession(): void {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this._user.set(null);
    for (const handler of this.logoutHandlers) {
      handler();
    }
  }

  /** Android: the system browser hands the login back via a deep link. */
  private listenForNativeLoginRedirect(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    void App.addListener('appUrlOpen', ({ url }) => {
      const parsed = new URL(url);
      if (!parsed.pathname.endsWith('/callback') && parsed.host !== 'auth') {
        return;
      }
      void Browser.close().catch(() => undefined);
      void this.router.navigateByUrl(
        `/auth/callback${parsed.search}`,
        { replaceUrl: true },
      );
    });
  }
}
