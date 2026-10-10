import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { downloadOutline, logoGoogle } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { ClientConfigService } from '../core/client-config.service';
import { errorMessageKey } from '../shared/error-message';
import { LanguageSwitchComponent } from '../shared/language-switch.component';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonText,
    LanguageSwitchComponent,
    TranslocoPipe,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly clientConfig = inject(ClientConfigService);

  protected readonly mode = signal<Mode>('login');
  protected readonly busy = signal(false);
  /** Translation key of the current error message. */
  protected readonly error = signal<string | null>(null);

  protected email = '';
  protected password = '';
  protected displayName = '';

  constructor() {
    addIcons({ logoGoogle, downloadOutline });
    void this.clientConfig.load();
  }

  protected setMode(value: unknown): void {
    this.mode.set(value === 'register' ? 'register' : 'login');
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email, this.password);
      } else {
        await this.auth.register(this.email, this.password, this.displayName);
      }
      this.password = '';
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      this.error.set(
        errorMessageKey(
          error,
          this.mode() === 'login' ? 'auth.loginFailed' : 'auth.registerFailed',
        ),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async google(): Promise<void> {
    this.error.set(null);
    await this.auth.loginWithGoogle();
  }
}
