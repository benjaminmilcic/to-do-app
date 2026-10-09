import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Note: inject() only works synchronously, so every dependency must be
// injected before the first `await`.

/** The app is only usable when signed in. */
export const authGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isLoggedIn() || router.parseUrl('/login');
};

/** Login and registration are pointless when already signed in. */
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return !auth.isLoggedIn() || router.parseUrl('/');
};
