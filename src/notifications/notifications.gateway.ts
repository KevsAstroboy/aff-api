import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId: number;
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      (client as AuthenticatedSocket).userId = payload.sub;
      client.join(`user:${payload.sub}`);

      this.logger.log(`User ${payload.sub} connected to notifications`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const authClient = client as AuthenticatedSocket;
    if (authClient.userId) {
      this.logger.log(`User ${authClient.userId} disconnected from notifications`);
    }
  }

  emitToUser(userId: number, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
