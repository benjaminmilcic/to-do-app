import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { loadConfig } from '../config/app-config.js';
import { TokensService } from '../auth/tokens.service.js';

export type SyncEvent = 'todo:upsert' | 'todo:delete';

const config = loadConfig();

/**
 * Pushes every change to all other devices of the same user.
 *
 * Clients authenticate with their access token in the Socket.IO handshake
 * (`auth: { token }`) and are put into a room per user. REST handlers call
 * `broadcast()` after a successful write; the device that made the change is
 * excluded via its socket id (sent as `X-Socket-Id`), it already has the
 * new state.
 */
@WebSocketGateway({
  path: '/api/socket.io',
  // Same-origin in production; the dev server and the Android WebView are
  // cross-origin.
  cors: {
    origin: config.isProduction ? config.corsOrigins : true,
    credentials: false,
  },
})
export class SyncGateway implements OnGatewayConnection {
  private readonly logger = new Logger(SyncGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly tokens: TokensService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token: unknown = client.handshake.auth?.token;
    try {
      if (typeof token !== 'string') {
        throw new Error('missing token');
      }
      const payload = await this.tokens.verifyAccessToken(token);
      client.data.userId = payload.sub;
      await client.join(roomFor(payload.sub));
    } catch {
      // The client refreshes its token and reconnects.
      client.emit('auth:error');
      client.disconnect(true);
    }
  }

  broadcast(
    userId: string,
    event: SyncEvent,
    payload: unknown,
    exceptSocketId?: string,
  ): void {
    let target = this.server.to(roomFor(userId));
    if (exceptSocketId) {
      target = target.except(exceptSocketId);
    }
    target.emit(event, payload);
    this.logger.debug(`${event} -> user ${userId}`);
  }
}

function roomFor(userId: string): string {
  return `user:${userId}`;
}
