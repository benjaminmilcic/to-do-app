import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { API_URL, type ClientConfig } from './api';

/** Public settings of the backend (is Google login enabled, APK link). */
@Injectable({ providedIn: 'root' })
export class ClientConfigService {
  private readonly http = inject(HttpClient);
  private loading: Promise<void> | null = null;

  readonly config = signal<ClientConfig>({ googleLogin: false, apkUrl: null });

  load(): Promise<void> {
    this.loading ??= firstValueFrom(
      this.http.get<ClientConfig>(`${API_URL}/config`),
    )
      .then((config) => this.config.set(config))
      .catch(() => {
        // Offline: keep defaults, try again next time.
        this.loading = null;
      });
    return this.loading;
  }

  /** The APK link only makes sense in the browser, not inside the app. */
  get apkDownloadUrl(): string | null {
    return Capacitor.isNativePlatform() ? null : this.config().apkUrl;
  }
}
