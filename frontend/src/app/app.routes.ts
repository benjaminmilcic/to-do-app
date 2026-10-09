import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./todos/todos.page').then((m) => m.TodosPage),
  },
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./auth/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  { path: '**', redirectTo: '' },
];
