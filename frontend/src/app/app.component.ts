import { Component, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // A new version was deployed and downloaded. Reload the next time the app
    // is not in front of the user, so that nobody loses a half-typed todo and
    // the installed PWA does not run stale code against a newer API for long.
    const updates = inject(SwUpdate);
    if (updates.isEnabled) {
      updates.versionUpdates.subscribe((event) => {
        if (event.type !== 'VERSION_READY') {
          return;
        }
        if (document.visibilityState === 'hidden') {
          document.location.reload();
          return;
        }
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            document.location.reload();
          }
        });
      });
    }
  }
}
