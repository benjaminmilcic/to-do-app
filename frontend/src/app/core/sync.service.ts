import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, type Socket } from 'socket.io-client';
import { API_ORIGIN, type Todo } from './api';
import { AuthService } from './auth.service';

export type SyncStatus = 'offline' | 'connecting' | 'online';

/**
 * Live connection to the backend. Every change made on another device or
 * browser arrives here within milliseconds.
 *
 * Events are only hints on top of the REST API: after every (re)connect the
 * todo store reloads the full list, so nothing is lost while offline.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;

  readonly status = signal<SyncStatus>('offline');

  readonly upserted$ = new Subject<Todo>();
  readonly deleted$ = new Subject<string[]>();
  /** Emits after every successful (re)connect. */
  readonly connected$ = new Subject<void>();

  constructor() {
    this.auth.onLogout(() => this.disconnect());
  }

  /** Socket id of this device, sent with every write (see interceptor). */
  get socketId(): string | null {
    return this.socket?.connected ? (this.socket.id ?? null) : null;
  }

  connect(): void {
    if (this.socket) {
      return;
    }
    this.status.set('connecting');

    const socket = io(API_ORIGIN || undefined, {
      path: '/api/socket.io',
      // The token is fetched for every (re)connect, so it is always fresh.
      auth: (callback) => {
        this.auth
          .getAccessToken()
          .then((token) => callback({ token }))
          .catch(() => callback({ token: null }));
      },
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 15_000,
    });

    socket.on('connect', () => {
      this.status.set('online');
      this.connected$.next();
    });
    socket.on('disconnect', (reason) => {
      this.status.set('offline');
      // A server-side disconnect is not retried automatically.
      if (reason === 'io server disconnect' && this.socket === socket) {
        setTimeout(() => socket.connect(), 2_000);
      }
    });
    socket.on('connect_error', () => this.status.set('offline'));
    socket.io.on('reconnect_attempt', () => this.status.set('connecting'));

    // The server rejected the token: refresh it, then reconnect.
    socket.on('auth:error', () => {
      void this.auth.refreshAccessToken().then((token) => {
        if (token && this.socket === socket) {
          socket.connect();
        }
      });
    });

    socket.on('todo:upsert', (todo: Todo) => this.upserted$.next(todo));
    socket.on('todo:delete', ({ ids }: { ids: string[] }) =>
      this.deleted$.next(ids),
    );

    this.socket = socket;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.status.set('offline');
  }
}
