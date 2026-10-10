import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { AppUpdateService } from './core/app-update.service';
import { ThemeService } from './core/theme.service';

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
    addIcons({ close });
    // Applies the saved appearance (also on the sign-in page).
    inject(ThemeService);
    inject(AppUpdateService).start();
  }
}
