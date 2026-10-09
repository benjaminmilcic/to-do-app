import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const CODE_TTL_MS = 2 * 60_000;

/**
 * Short-lived, single-use codes that bridge the Google OAuth redirect and the
 * app. Tokens never appear in URLs: the redirect carries only this code, which
 * the client exchanges via POST.
 *
 * Kept in memory on purpose - the API runs as a single process and a code is
 * redeemed within seconds. After a restart the user simply signs in again.
 */
@Injectable()
export class OneTimeCodes {
  private readonly codes = new Map<
    string,
    { userId: string; expires: number }
  >();

  issue(userId: string): string {
    this.purge();
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { userId, expires: Date.now() + CODE_TTL_MS });
    return code;
  }

  redeem(code: string): string | null {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    if (!entry || entry.expires < Date.now()) {
      return null;
    }
    return entry.userId;
  }

  private purge(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes) {
      if (entry.expires < now) {
        this.codes.delete(code);
      }
    }
  }
}
