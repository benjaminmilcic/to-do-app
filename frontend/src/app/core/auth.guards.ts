import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** The app is only usable when signed in. */
export const authGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  await auth.ready;
  return auth.isLoggedIn() || inject(Router).parseUrl('/login');
};

/** Login and registration are pointless when already signed in. */
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  await auth.ready;
  return !auth.isLoggedIn() || inject(Router).parseUrl('/');
};
