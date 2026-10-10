import { HttpErrorResponse } from '@angular/common/http';

/**
 * Maps an API error to the translation key of a short message for the user.
 * Returns `fallbackKey` for errors without a more specific message.
 */
export function errorMessageKey(error: unknown, fallbackKey: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallbackKey;
  }
  if (error.status === 0) {
    return 'errors.offline';
  }
  if (error.status === 429) {
    return 'errors.tooManyAttempts';
  }
  const message: unknown = error.error?.message;
  const text = Array.isArray(message) ? message[0] : message;
  switch (text) {
    case 'Invalid email or password':
      return 'errors.invalidCredentials';
    case 'An account with this email already exists':
      return 'errors.emailTaken';
    case 'Login code is invalid or expired':
      return 'errors.codeExpired';
  }
  if (typeof text === 'string' && text.includes('password must be longer')) {
    return 'errors.passwordTooShort';
  }
  if (typeof text === 'string' && text.includes('email must be an email')) {
    return 'errors.invalidEmail';
  }
  return fallbackKey;
}
