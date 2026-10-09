import { Component, inject, input, type OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../shared/error-message';

/**
 * Landing page after the Google login. The backend redirects here with a
 * one-time `code` (or an `error`), which is exchanged for a session.
 */
@Component({
  selector: 'app-auth-callback',
  template: `
    <ion-content class="ion-padding">
      <div class="center">
        @if (message(); as text) {
          <p>{{ text }}</p>
          <ion-button routerLink="/login" [replaceUrl]="true">
            Zurück zur Anmeldung
          </ion-button>
        } @else {
          <ion-spinner name="crescent" />
          <p>Anmeldung wird abgeschlossen …</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .center {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      text-align: center;
    }
  `,
  imports: [IonButton, IonContent, IonSpinner, RouterLink],
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Bound from the query string (withComponentInputBinding).
  readonly code = input<string>();
  readonly error = input<string>();

  protected readonly message = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const code = this.code();
    if (this.error() || !code) {
      this.message.set('Die Anmeldung mit Google wurde abgebrochen.');
      return;
    }
    try {
      await this.auth.completeGoogleLogin(code);
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      this.message.set(errorMessage(error, 'Die Anmeldung ist fehlgeschlagen.'));
    }
  }
}
