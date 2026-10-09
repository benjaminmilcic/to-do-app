import {
  HttpErrorResponse,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';

/** Endpoints that must work without (or must not trigger) a token refresh. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google/exchange',
  '/config',
];

/**
 * Adds the access token to API calls and retries once with a fresh token if
 * the API answers 401. Also tells the API which sync connection belongs to
 * this device, so that changes are not echoed back to it.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL)) {
    return next(request);
  }
  const path = request.url.slice(API_URL.length);
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next(request);
  }

  const auth = inject(AuthService);
  const sync = inject(SyncService);

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => next(withHeaders(request, token, sync.socketId))),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.refreshAccessToken()).pipe(
        switchMap((token) =>
          token
            ? next(withHeaders(request, token, sync.socketId))
            : throwError(() => error),
        ),
      );
    }),
  );
};

function withHeaders(
  request: HttpRequest<unknown>,
  token: string | null,
  socketId: string | null,
): HttpRequest<unknown> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (socketId) {
    headers['X-Socket-Id'] = socketId;
  }
  return request.clone({ setHeaders: headers });
}
