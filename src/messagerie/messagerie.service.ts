import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { Message } from './schemas/message.schema';
import { MESSAGE_MODEL } from './message.constants';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagerieService {
  private readonly logger = new Logger(MessagerieService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_MODEL)
    private readonly messageModel: Model<Message>,
  ) {}

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('conversation');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.conversation.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async create(userId: number, dto: CreateConversationDto) {
    const now = new Date();

    if (dto.type_id === 1) {
      if (!dto.user2_id) {
        throw new ConflictException(
          'user2_id requis pour une conversation directe',
        );
      }

      const user1_id = Math.min(userId, dto.user2_id);
      const user2_id = Math.max(userId, dto.user2_id);

      const existing = await this.prisma.conversation.findFirst({
        where: {
          type_id: 1,
          user1_id,
          user2_id,
          is_deleted: false,
        },
      });

      if (existing) {
        const participant =
          await this.prisma.conversation_participant.findFirst({
            where: {
              conversation_id: existing.id,
              user_id: userId,
            },
          });

        if (!participant) {
          await this.prisma.conversation_participant.create({
            data: {
              conversation_id: existing.id,
              user_id: userId,
              joined_at: now,
            },
          });
        }

        if (participant?.is_deleted) {
          await this.prisma.conversation_participant.update({
            where: { id: participant.id },
            data: { is_deleted: false, joined_at: now },
          });
        }

        return existing;
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          type_id: 1,
          user1_id,
          user2_id,
          created_by: userId,
          created_at: now,
        },
      });

      await this.prisma.conversation_participant.createMany({
        data: [
          {
            conversation_id: conversation.id,
            user_id: user1_id,
            joined_at: now,
          },
          {
            conversation_id: conversation.id,
            user_id: user2_id,
            joined_at: now,
          },
        ],
      });

      return conversation;
    }

    if (!dto.nom) {
      throw new ConflictException(
        'nom requis pour une conversation de groupe',
      );
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type_id: 2,
        nom: dto.nom,
        description: dto.description,
        created_by: userId,
        created_at: now,
      },
    });

    await this.prisma.conversation_participant.create({
      data: {
        conversation_id: conversation.id,
        user_id: userId,
        joined_at: now,
      },
    });

    return conversation;
  }

  async findUserConversations(userId: number) {
    const participants = await this.prisma.conversation_participant.findMany({
      where: { user_id: userId, is_deleted: false },
      include: {
        conversation: {
          include: {
            conversation_participant: {
              where: { is_deleted: false },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    nom: true,
                    prenom: true,
                    profile_picture_path: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { created_at: 'desc' } },
    });

    const result: Record<string, unknown>[] = [];
    for (const p of participants) {
      const conv = p.conversation!;
      const lastMessage = await this.messageModel
        .findOne({ conversation_id: conv.id })
        .sort({ sent_at: -1 })
        .lean();

      const mappedParticipants = conv.conversation_participant.map((cp) => ({
        user_id: cp.user!.id,
        username: cp.user!.username,
        nom_complet: [cp.user!.prenom, cp.user!.nom]
          .filter(Boolean)
          .join(' '),
        profile_picture_path: cp.user!.profile_picture_path,
        joined_at: cp.joined_at,
        dernier_lu_at: cp.dernier_lu_at,
      }));

      result.push({
        id: conv.id,
        type_id: conv.type_id,
        nom: conv.nom,
        description: conv.description,
        is_canal_general: conv.is_canal_general,
        created_at: conv.created_at,
        participants: mappedParticipants,
        last_message: lastMessage
          ? {
              _id: (lastMessage as any)._id.toString(),
              sender_id: lastMessage.sender_id,
              contenu: lastMessage.contenu,
              type: lastMessage.type,
              sent_at: lastMessage.sent_at,
            }
          : undefined,
      });
    }

    return result;
  }

  async findOne(id: number, userId: number) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, is_deleted: false },
      include: {
        conversation_participant: {
          where: { is_deleted: false },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nom: true,
                prenom: true,
                profile_picture_path: true,
              },
            },
          },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }

    const isParticipant = conv.conversation_participant.some(
      (cp) => cp.user_id === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette conversation',
      );
    }

    const lastMessage = await this.messageModel
      .findOne({ conversation_id: conv.id })
      .sort({ sent_at: -1 })
      .lean();

    const mappedParticipants = conv.conversation_participant.map((cp) => ({
      user_id: cp.user!.id,
      username: cp.user!.username,
      nom_complet: [cp.user!.prenom, cp.user!.nom]
        .filter(Boolean)
        .join(' '),
      profile_picture_path: cp.user!.profile_picture_path,
      joined_at: cp.joined_at,
      dernier_lu_at: cp.dernier_lu_at,
    }));

    return {
      id: conv.id,
      type_id: conv.type_id,
      nom: conv.nom,
      description: conv.description,
      is_canal_general: conv.is_canal_general,
      created_at: conv.created_at,
      participants: mappedParticipants,
      last_message: lastMessage
        ? {
            _id: (lastMessage as any)._id.toString(),
            sender_id: lastMessage.sender_id,
            contenu: lastMessage.contenu,
            type: lastMessage.type,
            sent_at: lastMessage.sent_at,
          }
        : undefined,
    };
  }

  async addParticipant(
    conversationId: number,
    userId: number,
    actorId: number,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, is_deleted: false },
    });

    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }

    if (conv.type_id === 1) {
      throw new ConflictException(
        "Impossible d'ajouter un participant à une conversation directe",
      );
    }

    const actorIsParticipant =
      await this.prisma.conversation_participant.findFirst({
        where: {
          conversation_id: conversationId,
          user_id: actorId,
          is_deleted: false,
        },
      });

    if (!actorIsParticipant) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette conversation',
      );
    }

    const existing = await this.prisma.conversation_participant.findFirst({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (existing && !existing.is_deleted) {
      throw new ConflictException('Cet utilisateur est déjà participant');
    }

    if (existing?.is_deleted) {
      return this.prisma.conversation_participant.update({
        where: { id: existing.id },
        data: { is_deleted: false, joined_at: new Date() },
      });
    }

    return this.prisma.conversation_participant.create({
      data: {
        conversation_id: conversationId,
        user_id: userId,
        joined_at: new Date(),
      },
    });
  }

  async removeParticipant(conversationId: number, userId: number) {
    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant introuvable');
    }

    return this.prisma.conversation_participant.update({
      where: { id: participant.id },
      data: { is_deleted: true },
    });
  }

  async sendMessage(userId: number, dto: SendMessageDto) {
    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: dto.conversation_id,
        user_id: userId,
        is_deleted: false,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette conversation',
      );
    }

    const msg = await this.messageModel.create({
      conversation_id: dto.conversation_id,
      sender_id: userId,
      contenu: dto.contenu,
      attachment_url: dto.attachment_url,
      type: dto.attachment_url ? 'file' : 'text',
      sent_at: new Date(),
    });

    return {
      _id: msg._id.toString(),
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      contenu: msg.contenu,
      attachment_url: msg.attachment_url,
      type: msg.type,
      sent_at: msg.sent_at,
    };
  }

  async getMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false,
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette conversation',
      );
    }

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversation_id: conversationId })
        .sort({ sent_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({ conversation_id: conversationId }),
    ]);

    return {
      data: messages.map((m) => ({
        _id: (m as any)._id.toString(),
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        contenu: m.contenu,
        attachment_url: m.attachment_url,
        type: m.type,
        sent_at: m.sent_at,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(conversationId: number, userId: number) {
    const participant = await this.prisma.conversation_participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        is_deleted: false,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant introuvable');
    }

    return this.prisma.conversation_participant.update({
      where: { id: participant.id },
      data: { dernier_lu_at: new Date() },
    });
  }
}
