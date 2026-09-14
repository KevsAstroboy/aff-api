import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number, unreadOnly: boolean) {
    const where: Record<string, unknown> = { user_id: userId };
    if (unreadOnly) where.is_read = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });

    return { items, total, unread_count: unreadCount };
  }

  async unreadCount(userId: number) {
    return {
      count: await this.prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    };
  }

  async markRead(userId: number, notificationId: number) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });
    if (!notif) return { success: false };

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return { success: true };
  }

  async create(data: {
    user_id: number;
    type: string;
    title: string;
    body?: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: { ...data, created_at: new Date() },
    });
  }
}
