import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ToastController } from '@ionic/angular';
import { API_ORIGIN } from './api';

/**
 * How often to look for a new version while the app stays open in the
 * foreground. Each check only fetches a tiny file.
 */
const CHECK_INTERVAL_MS = 5 * 60_000;

/** Published next to the APK by the build-apk workflow. */
const APK_VERSION_URL = `${API_ORIGIN}/downloads/version.json`;

interface ApkVersion {
  versionCode: number;
  versionName: string;
  url: string;
}

/**
 * Keeps the app up to date.
 *
 * Web / PWA: the service worker starts the app from its cache and downloads a
 * new deployment in the background. Once that download is complete, the user
 * gets a hint with an "update" button. If they ignore it, the new version is
 * loaded the next time the app is in the background, so nobody loses a
 * half-typed todo and the app does not run stale code against a newer API for
 * long.
 *
 * Android: the app's files are part of the APK, so an update means installing
 * a new APK. The app compares its own build number with the one published on
 * the server and offers the download.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastController);

  private updateReady = false;
  /** Android: the APK version the hint was last shown (or dismissed) for. */
  private apkHintShownFor = 0;
  private apkCheckRunning = false;

  start(): void {
    if (Capacitor.isNativePlatform()) {
      this.startNative();
    } else {
      this.startWeb();
    }
  }

  // --- Web / PWA -------------------------------------------------------------

  private startWeb(): void {
    if (!this.updates.isEnabled) {
      return;
    }

    this.updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY' && !this.updateReady) {
        this.updateReady = true;
        void this.showHint('Neue Version verfügbar', 'Aktualisieren', () =>
          document.location.reload(),
        );
      }
    });

    // The cached version can no longer be served (e.g. files deleted on the
    // server): only a reload helps.
    this.updates.unrecoverable.subscribe(() => document.location.reload());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (this.updateReady) {
          document.location.reload();
        }
      } else {
        // Coming back to the app (e.g. reopening the PWA window) is the
        // moment a new deployment is most likely to be waiting.
        this.checkWeb();
      }
    });
    setInterval(() => this.checkWeb(), CHECK_INTERVAL_MS);
  }

  private checkWeb(): void {
    if (!this.updateReady) {
      this.updates.checkForUpdate().catch(() => {
        // Offline: try again on the next occasion.
      });
    }
  }

  // --- Android ---------------------------------------------------------------

  private startNative(): void {
    void this.checkApk();
    // Coming back from the background. `resume` and `appStateChange` both
    // fire on Android; checkApk() shows each version's hint only once.
    void App.addListener('resume', () => void this.checkApk());
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void this.checkApk();
      }
    });
    setInterval(() => void this.checkApk(), CHECK_INTERVAL_MS);
  }

  private async checkApk(): Promise<void> {
    // Several triggers can fire at once; one check at a time is enough.
    if (this.apkCheckRunning) {
      return;
    }
    this.apkCheckRunning = true;
    try {
      const installed = Number((await App.getInfo()).build);
      // Native HTTP: the static file on the server sends no CORS headers.
      const response = await CapacitorHttp.get({
        url: `${APK_VERSION_URL}?t=${Date.now()}`,
        responseType: 'json',
      });
      if (response.status !== 200) {
        return;
      }
      const latest = (
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data
      ) as ApkVersion;

      if (
        !Number.isFinite(installed) ||
        latest.versionCode <= installed ||
        latest.versionCode <= this.apkHintShownFor
      ) {
        return;
      }
      this.apkHintShownFor = latest.versionCode;
      await this.showHint(
        `Neue App-Version ${latest.versionName} verfügbar`,
        'Herunterladen',
        () => void Browser.open({ url: latest.url }),
      );
    } catch {
      // Offline or file missing: try again on the next occasion.
    } finally {
      this.apkCheckRunning = false;
    }
  }

  // ---------------------------------------------------------------------------

  private async showHint(
    message: string,
    action: string,
    handler: () => void,
  ): Promise<void> {
    const toast = await this.toasts.create({
      message,
      position: 'bottom',
      color: 'primary',
      buttons: [
        { text: action, handler },
        { icon: 'close', role: 'cancel', side: 'end' },
      ],
    });
    await toast.present();
  }
}
