import { Component, inject, input, type OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../core/auth.service';
import { errorMessageKey } from '../shared/error-message';

/**
 * Landing page after the Google login. The backend redirects here with a
 * one-time `code` (or an `error`), which is exchanged for a session.
 */
@Component({
  selector: 'app-auth-callback',
  template: `
    <ion-content class="ion-padding">
      <div class="center">
        @if (message(); as key) {
          <p>{{ key | transloco }}</p>
          <ion-button routerLink="/login" [replaceUrl]="true">
            {{ 'auth.backToLogin' | transloco }}
          </ion-button>
        } @else {
          <ion-spinner name="crescent" />
          <p>{{ 'auth.callbackBusy' | transloco }}</p>
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
  imports: [IonButton, IonContent, IonSpinner, RouterLink, TranslocoPipe],
})
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Bound from the query string (withComponentInputBinding).
  readonly code = input<string>();
  readonly error = input<string>();

  /** Translation key of the message shown instead of the spinner. */
  protected readonly message = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const code = this.code();
    if (this.error() || !code) {
      this.message.set('auth.callbackCancelled');
      return;
    }
    try {
      await this.auth.completeGoogleLogin(code);
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      this.message.set(errorMessageKey(error, 'auth.callbackFailed'));
    }
  }
}
