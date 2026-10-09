import { HttpErrorResponse } from '@angular/common/http';

/** Turns an API error into a short German message for the user. */
export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'Keine Verbindung zum Server. Bist du online?';
  }
  if (error.status === 429) {
    return 'Zu viele Versuche. Bitte warte eine Minute.';
  }
  const message: unknown = error.error?.message;
  const text = Array.isArray(message) ? message[0] : message;
  switch (text) {
    case 'Invalid email or password':
      return 'E-Mail oder Passwort ist falsch.';
    case 'An account with this email already exists':
      return 'Für diese E-Mail-Adresse gibt es schon ein Konto.';
    case 'Login code is invalid or expired':
      return 'Der Login ist abgelaufen. Bitte versuche es noch einmal.';
  }
  if (typeof text === 'string' && text.includes('password must be longer')) {
    return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  }
  if (typeof text === 'string' && text.includes('email must be an email')) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }
  return fallback;
}
