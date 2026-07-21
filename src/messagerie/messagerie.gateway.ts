import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Message } from './schemas/message.schema';
import { MESSAGE_MODEL } from './message.constants';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId: number;
  username: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class MessagerieGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(MESSAGE_MODEL)
    private readonly messageModel: Model<Message>,
    private readonly prisma: PrismaService,
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
      (client as AuthenticatedSocket).username = payload.username;

      await this.redis.set(`presence:${payload.sub}`, 'online', 'EX', 300);
      this.server.emit('user_presence', {
        user_id: payload.sub,
        status: 'online',
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const authClient = client as AuthenticatedSocket;
    if (authClient.userId) {
      await this.redis.del(`presence:${authClient.userId}`);
      this.server.emit('user_presence', {
        user_id: authClient.userId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: number },
  ) {
    if (!client.userId) return;

    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: data.conversation_id,
        user_id: client.userId,
        is_deleted: false,
      },
    });

    if (!participant) return;

    const room = `conversation:${data.conversation_id}`;
    client.join(room);
    client.emit('joined_conversation', {
      conversation_id: data.conversation_id,
    });
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: number },
  ) {
    const room = `conversation:${data.conversation_id}`;
    client.leave(room);
    client.emit('left_conversation', { conversation_id: data.conversation_id });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversation_id: number; contenu: string; attachment_url?: string },
  ) {
    if (!client.userId) return;

    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: data.conversation_id,
        user_id: client.userId,
        is_deleted: false,
      },
    });

    if (!participant) return;

    const msg = await this.messageModel.create({
      conversation_id: data.conversation_id,
      sender_id: client.userId,
      contenu: data.contenu,
      attachment_url: data.attachment_url,
      type: data.attachment_url ? 'file' : 'text',
      sent_at: new Date(),
    });

    const messagePayload = {
      _id: msg._id.toString(),
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_username: client.username,
      contenu: msg.contenu,
      attachment_url: msg.attachment_url,
      type: msg.type,
      sent_at: msg.sent_at,
    };

    const room = `conversation:${data.conversation_id}`;
    this.server.to(room).emit('new_message', messagePayload);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: number },
  ) {
    if (!client.userId) return;

    const key = `typing:${data.conversation_id}:${client.userId}`;
    await this.redis.set(key, '1', 'EX', 5);

    const room = `conversation:${data.conversation_id}`;
    client.to(room).emit('user_typing', {
      conversation_id: data.conversation_id,
      user_id: client.userId,
      username: client.username,
    });
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversation_id: number },
  ) {
    if (!client.userId) return;

    const key = `typing:${data.conversation_id}:${client.userId}`;
    await this.redis.del(key);

    const room = `conversation:${data.conversation_id}`;
    client.to(room).emit('user_stop_typing', {
      conversation_id: data.conversation_id,
      user_id: client.userId,
      username: client.username,
    });
  }
}
