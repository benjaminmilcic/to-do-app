import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';

/** Look for a new version at most this often while the app is open. */
const CHECK_INTERVAL_MS = 30 * 60_000;

/**
 * Keeps the installed PWA up to date.
 *
 * The service worker starts the app from its cache and downloads a new
 * deployment in the background. Once that download is complete, the user gets
 * a hint with an "update" button. If they ignore it, the new version is loaded
 * the next time the app is in the background, so nobody loses a half-typed
 * todo and the app does not run stale code against a newer API for long.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastController);

  private updateReady = false;

  start(): void {
    if (!this.updates.isEnabled) {
      return;
    }

    this.updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY' && !this.updateReady) {
        this.updateReady = true;
        void this.showHint();
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
        this.check();
      }
    });
    setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  private check(): void {
    if (!this.updateReady) {
      this.updates.checkForUpdate().catch(() => {
        // Offline: try again on the next occasion.
      });
    }
  }

  private async showHint(): Promise<void> {
    const toast = await this.toasts.create({
      message: 'Neue Version verfügbar',
      position: 'bottom',
      color: 'primary',
      buttons: [
        {
          text: 'Aktualisieren',
          handler: () => document.location.reload(),
        },
        { icon: 'close', role: 'cancel', side: 'end' },
      ],
    });
    await toast.present();
  }
}
