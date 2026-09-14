import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { UpdateCommentStatutDto } from './dto/update-comment-statut.dto';
import { UpdatePublicationStatutDto } from './dto/update-publication-statut.dto';
import { Prisma } from '@prisma/client';

const authorSelect = {
  id: true,
  username: true,
  nom: true,
  prenom: true,
  profile_picture_path: true,
  is_officiel: true,
};

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: number, dto: CreatePublicationDto) {
    const publication = await this.prisma.$transaction(async (tx) => {
      const pub = await tx.publication.create({
        data: {
          contenu: dto.contenu,
          user_id: userId,
          communaute_id: dto.communaute_id ?? null,
          statut_id: 1,
          created_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
          reactions_count: 0,
          commentaires_count: 0,
          partages_count: 0,
        },
      });

      if (dto.hashtags && dto.hashtags.length > 0) {
        for (const libelle of dto.hashtags) {
          const normalized = libelle.trim();
          if (!normalized) continue;

          let hashtag = await tx.hashtag.findFirst({
            where: { libelle: normalized, is_deleted: false },
          });

          if (!hashtag) {
            hashtag = await tx.hashtag.create({
              data: { libelle: normalized, publications_count: 0, created_at: new Date() },
            });
          }

          await tx.publication_hashtag.create({
            data: { publication_id: pub.id, hashtag_id: hashtag.id },
          });

          await tx.hashtag.update({
            where: { id: hashtag.id },
            data: { publications_count: { increment: 1 } },
          });
        }
      }

      return pub;
    });

    if (dto.images && dto.images.length > 0) {
      for (let i = 0; i < dto.images.length; i++) {
        const ext = dto.images[i].match(/^data:image\/([A-Za-z-+]+);base64,/)
          ? (dto.images[i].match(/^data:image\/([A-Za-z-+]+);base64,/)![1] === 'jpeg' ? 'jpg' : dto.images[i].match(/^data:image\/([A-Za-z-+]+);base64,/)![1])
          : 'jpg';

        const objectName = `publications/${publication.id}/image_${i + 1}.${ext}`;
        const filePath = await this.storage.uploadBase64(
          dto.images[i],
          'aff-uploads',
          objectName,
        );

        await this.prisma.publication_media.create({
          data: {
            publication_id: publication.id,
            file_path: filePath,
            ordre: i + 1,
          },
        });
      }
    }

    return this.findOne(publication.id);
  }

  async findAll(query: {
    communaute_id?: number;
    hashtag_id?: number;
    user_id?: number;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.publicationWhereInput = {
      is_deleted: false,
    };

    if (query.communaute_id) {
      where.communaute_id = query.communaute_id;
    }

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    const [publications, total] = await Promise.all([
      this.prisma.publication.findMany({
        where,
        include: {
          user: { select: authorSelect },
          publication_hashtag: {
            include: { hashtag: { select: { id: true, libelle: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.publication.count({ where }),
    ]);

    const counts = await this.reactionsByPublication(publications.map((p) => p.id));

    return {
      data: publications.map((p) => this.formatPublication(p, counts.get(p.id))),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async reactionsByPublication(publicationIds: number[]) {
    const map = new Map<
      number,
      { reaction_type_id: number | null; code?: string | null; emoji?: string | null; count: number }[]
    >();
    if (publicationIds.length === 0) return map;

    const groups = await this.prisma.reaction.groupBy({
      by: ['publication_id', 'reaction_type_id'],
      where: { publication_id: { in: publicationIds }, is_deleted: false },
      _count: { _all: true },
    });

    const types = await this.prisma.reaction_type.findMany();
    const typeById = new Map(types.map((t) => [t.id, t]));

    for (const g of groups) {
      const t = g.reaction_type_id != null ? typeById.get(g.reaction_type_id) : null;
      const arr = map.get(g.publication_id!) ?? [];
      arr.push({
        reaction_type_id: g.reaction_type_id,
        code: t?.code,
        emoji: t?.emoji,
        count: g._count._all,
      });
      map.set(g.publication_id!, arr);
    }

    return map;
  }

  async findOne(id: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, is_deleted: false },
      include: {
        user: { select: authorSelect },
        publication_hashtag: {
          include: { hashtag: { select: { id: true, libelle: true } } },
        },
        publication_media: {
          where: { is_deleted: false },
          orderBy: { ordre: 'asc' },
        },
        commentaire: {
          where: { is_deleted: false, parent_commentaire_id: null },
          include: {
            user: { select: { id: true, username: true, profile_picture_path: true } },
            other_commentaire: {
              where: { is_deleted: false },
              include: {
                user: { select: { id: true, username: true, profile_picture_path: true } },
              },
              orderBy: { created_at: 'asc' },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    } as Prisma.publicationFindFirstArgs & { include: any });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const counts = await this.reactionsByPublication([pub.id]);
    const reactions = counts.get(pub.id) ?? [];

    return {
      ...this.formatPublication(pub, reactions),
      commentaires: pub.commentaire.map((c) => ({
        id: c.id,
        publication_id: c.publication_id,
        contenu: c.contenu,
        parent_commentaire_id: c.parent_commentaire_id,
        user: c.user,
        created_at: c.created_at,
        updated_at: c.updated_at,
        replies: (c.other_commentaire ?? []).map((r) => ({
          id: r.id,
          publication_id: r.publication_id,
          contenu: r.contenu,
          parent_commentaire_id: r.parent_commentaire_id,
          user: r.user,
          created_at: r.created_at,
          updated_at: r.updated_at,
          replies: [],
        })),
      })),
    };
  }

  async update(id: number, userId: number, dto: UpdatePublicationDto) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    if (pub.user_id !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres publications');
    }

    await this.prisma.publication.update({
      where: { id },
      data: {
        contenu: dto.contenu ?? pub.contenu,
        communaute_id: dto.communaute_id,
        updated_by: userId,
        updated_at: new Date(),
      },
    });

    if (dto.hashtags) {
      await this.prisma.$transaction(async (tx) => {
        await tx.publication_hashtag.updateMany({
          where: { publication_id: id },
          data: { is_deleted: true },
        });

        for (const libelle of dto.hashtags!) {
          const normalized = libelle.trim();
          if (!normalized) continue;

          let hashtag = await tx.hashtag.findFirst({
            where: { libelle: normalized, is_deleted: false },
          });

          if (!hashtag) {
            hashtag = await tx.hashtag.create({
              data: { libelle: normalized, publications_count: 0, created_at: new Date() },
            });
          }

          await tx.publication_hashtag.upsert({
            where: { publication_id_hashtag_id: { publication_id: id, hashtag_id: hashtag.id } },
            create: { publication_id: id, hashtag_id: hashtag.id },
            update: { is_deleted: false },
          });

          await tx.hashtag.update({
            where: { id: hashtag.id },
            data: { publications_count: { increment: 1 } },
          });
        }
      });
    }

    return this.findOne(id);
  }

  async remove(id: number, userId: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, is_deleted: false },
      include: { user: { select: { is_officiel: true } } },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const isAdmin = await this.isAdmin(userId);

    if (pub.user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres publications',
      );
    }

    await this.prisma.publication.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
      },
    });

    return { message: 'Publication supprimée' };
  }

  async toggleReaction(userId: number, publicationId: number, reactionTypeId: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const existing = await this.prisma.reaction.findUnique({
      where: { user_id_publication_id: { user_id: userId, publication_id: publicationId } },
    });

    if (existing) {
      if (existing.reaction_type_id === reactionTypeId) {
        await this.prisma.reaction.delete({
          where: { user_id_publication_id: { user_id: userId, publication_id: publicationId } },
        });

        return { toggled: 'off', reaction_type_id: reactionTypeId, counts: await this.getReactions(publicationId) };
      }

      const oldTypeId = existing.reaction_type_id;
      await this.prisma.reaction.update({
        where: { user_id_publication_id: { user_id: userId, publication_id: publicationId } },
        data: { reaction_type_id: reactionTypeId, created_at: new Date() },
      });

      return { toggled: 'changed', old_type_id: oldTypeId, new_type_id: reactionTypeId, counts: await this.getReactions(publicationId) };
    }

    await this.prisma.reaction.create({
      data: {
        user_id: userId,
        publication_id: publicationId,
        reaction_type_id: reactionTypeId,
        created_at: new Date(),
      },
    });

    const result = { toggled: 'on', reaction_type_id: reactionTypeId, counts: await this.getReactions(publicationId) };
    this.emitReactionEvent(userId, pub.user_id!, publicationId, reactionTypeId);
    return result;
  }

  private async emitReactionEvent(userId: number, pubOwnerId: number, publicationId: number, reactionTypeId: number) {
    const reactionType = await this.prisma.reaction_type.findUnique({
      where: { id: reactionTypeId },
      select: { code: true },
    });
    this.eventEmitter.emit('reaction.toggled', {
      authorId: userId,
      authorUsername: '',
      publicationOwnerId: pubOwnerId,
      publicationId,
      reactionType: reactionType?.code ?? 'HEART',
    });
  }

  async getReactions(publicationId: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const groups = await this.prisma.reaction.groupBy({
      by: ['reaction_type_id'],
      where: { publication_id: publicationId, is_deleted: false },
      _count: { _all: true },
    });

    const types = await this.prisma.reaction_type.findMany();
    const typeById = new Map(types.map((t) => [t.id, t]));

    return groups
      .map((g) => {
        const t = typeById.get(g.reaction_type_id ?? -1);
        if (!t) return null;
        return {
          reaction_type_id: g.reaction_type_id,
          libelle: t.libelle,
          emoji: t.emoji,
          code: t.code,
          count: g._count._all,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  async createCommentaire(userId: number, dto: CreateCommentaireDto) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: dto.publication_id, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    if (dto.parent_commentaire_id) {
      const parent = await this.prisma.commentaire.findFirst({
        where: { id: dto.parent_commentaire_id, is_deleted: false },
      });

      if (!parent) {
        throw new NotFoundException('Commentaire parent introuvable');
      }

      if (parent.parent_commentaire_id !== null) {
        throw new BadRequestException(
          'Impossible de répondre à une réponse (2 niveaux max)',
        );
      }
    }

    const commentaire = await this.prisma.commentaire.create({
      data: {
        publication_id: dto.publication_id,
        user_id: userId,
        contenu: dto.contenu,
        parent_commentaire_id: dto.parent_commentaire_id ?? null,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        user: { select: { id: true, username: true, profile_picture_path: true } },
      },
    });

    await this.prisma.publication.update({
      where: { id: dto.publication_id },
      data: { commentaires_count: { increment: 1 } },
    });

    this.eventEmitter.emit('comment.created', {
      authorId: userId,
      authorUsername: commentaire.user?.username ?? 'Un utilisateur',
      publicationOwnerId: pub.user_id!,
      publicationId: dto.publication_id,
    });

    return {
      id: commentaire.id,
      publication_id: commentaire.publication_id,
      contenu: commentaire.contenu,
      parent_commentaire_id: commentaire.parent_commentaire_id,
      user: commentaire.user,
      created_at: commentaire.created_at,
      updated_at: commentaire.updated_at,
      replies: [],
    };
  }

  async findCommentairesByPublication(publicationId: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const commentaires = await this.prisma.commentaire.findMany({
      where: { publication_id: publicationId, is_deleted: false, parent_commentaire_id: null },
      include: {
        user: { select: { id: true, username: true, profile_picture_path: true } },
        other_commentaire: {
          where: { is_deleted: false },
          include: {
            user: { select: { id: true, username: true, profile_picture_path: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return commentaires.map((c) => ({
      id: c.id,
      publication_id: c.publication_id,
      contenu: c.contenu,
      parent_commentaire_id: c.parent_commentaire_id,
      user: c.user,
      created_at: c.created_at,
      updated_at: c.updated_at,
      replies: (c.other_commentaire ?? []).map((r) => ({
        id: r.id,
        publication_id: r.publication_id,
        contenu: r.contenu,
        parent_commentaire_id: r.parent_commentaire_id,
        user: r.user,
        created_at: r.created_at,
        updated_at: r.updated_at,
        replies: [],
      })),
    }));
  }

  async removeCommentaire(id: number, userId: number) {
    const commentaire = await this.prisma.commentaire.findFirst({
      where: { id, is_deleted: false },
    });

    if (!commentaire) {
      throw new NotFoundException('Commentaire introuvable');
    }

    const isAdmin = await this.isAdmin(userId);

    if (commentaire.user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commentaire.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      const childCount = await tx.commentaire.count({
        where: { parent_commentaire_id: id, is_deleted: false },
      });

      await tx.publication.update({
        where: { id: commentaire.publication_id! },
        data: { commentaires_count: { decrement: 1 + childCount } },
      });
    });

    return { message: 'Commentaire supprimé' };
  }

  async findAllHashtags() {
    return this.prisma.hashtag.findMany({
      where: { is_deleted: false },
      select: { id: true, libelle: true, publications_count: true },
      orderBy: { publications_count: 'desc' },
    });
  }

  async findAllReactionTypes() {
    return this.prisma.reaction_type.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createIfNotExists(libelle: string): Promise<number> {
    libelle = libelle.trim();

    const existing = await this.prisma.hashtag.findFirst({
      where: { libelle, is_deleted: false },
    });

    if (existing) return existing.id;

    const created = await this.prisma.hashtag.create({
      data: { libelle, created_at: new Date() },
    });

    return created.id;
  }

  async getCommentairesByCriteria(query: Record<string, string>) {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('commentaire');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.commentaire.findMany({
        where: { AND: [where, { is_deleted: false }] },
        include: {
          user: { select: { id: true, username: true, profile_picture_path: true } },
          publication: { select: { id: true, contenu: true } },
        },
        ...(orderBy ? { orderBy } : { orderBy: { created_at: 'desc' as const } }),
        skip,
        take,
        ...(select ? { select } : {}),
      }),
      this.prisma.commentaire.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async updateCommentStatut(id: number, dto: UpdateCommentStatutDto) {
    const comment = await this.prisma.commentaire.findFirst({
      where: { id, is_deleted: false },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    return this.prisma.commentaire.update({
      where: { id },
      data: {
        is_hidden: dto.is_hidden,
        hidden_reason: dto.is_hidden ? dto.hidden_reason : null,
        updated_at: new Date(),
      },
    });
  }

  async updatePublicationStatut(id: number, dto: UpdatePublicationStatutDto) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, is_deleted: false },
    });
    if (!pub) throw new NotFoundException('Publication introuvable');

    return this.prisma.publication.update({
      where: { id },
      data: { statut_id: dto.statut_id, updated_at: new Date() },
      include: {
        user: { select: { id: true, username: true, profile_picture_path: true } },
      },
    });
  }

  async getCountsByCommunaute() {
    const rows = await this.prisma.publication.groupBy({
      by: ['communaute_id'],
      where: { is_deleted: false, statut_id: 1, communaute_id: { not: null } },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      communaute_id: r.communaute_id,
      count: r._count._all,
    }));
  }

  async getMembresActifs(limit = 10) {
    const LIMIT = Math.min(Math.max(limit, 1), 30);
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [pubs, comments, reactions] = await Promise.all([
      this.prisma.publication.findMany({
        where: { is_deleted: false, created_at: { gte: since }, user_id: { not: null } },
        select: { user_id: true },
      }),
      this.prisma.commentaire.findMany({
        where: { is_deleted: false, created_at: { gte: since }, user_id: { not: null } },
        select: { user_id: true },
      }),
      this.prisma.reaction.findMany({
        where: { is_deleted: false, created_at: { gte: since }, user_id: { not: null } },
        select: { user_id: true },
      }),
    ]);

    const scores: Record<number, number> = {};
    const bump = (id: number, w: number) => {
      scores[id] = (scores[id] ?? 0) + w;
    };
    comments.forEach((c) => c.user_id && bump(c.user_id, 3));
    reactions.forEach((r) => r.user_id && bump(r.user_id, 2));
    pubs.forEach((p) => p.user_id && bump(p.user_id, 1));

    const ids = Object.keys(scores)
      .map(Number)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, LIMIT);

    if (ids.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, is_deleted: false },
      select: {
        id: true,
        username: true,
        nom: true,
        prenom: true,
        profile_picture_path: true,
        user_communaute: {
          where: { is_deleted: false },
          select: { communaute: { select: { id: true, libelle: true, code: true } } },
          orderBy: { joined_at: 'asc' },
        },
      },
    });

    const byId = new Map(users.map((u) => [u.id, u]));
    return ids
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => {
        const communautes = (u.user_communaute ?? [])
          .map((uc) => uc.communaute)
          .filter((c): c is NonNullable<typeof c> => !!c);
        return {
          id: u.id,
          username: u.username,
          nom: u.nom,
          prenom: u.prenom,
          profile_picture_path: u.profile_picture_path,
          activity_score: scores[u.id],
          communautes,
          communaute_principale: communautes[0] ?? null,
        };
      });
  }

  private async isAdmin(userId: number): Promise<boolean> {
    const up = await this.prisma.user_profil.findFirst({
      where: { user_id: userId, profil_id: 2, is_deleted: false },
    });
    return !!up;
  }

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('publication');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.publication.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.publication.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  private formatPublication(
    pub: Record<string, unknown>,
    reactions:
      | { reaction_type_id: number | null; code?: string | null; emoji?: string | null; count: number }[]
      | undefined = [],
  ) {
    const hashtags = (pub.publication_hashtag as unknown[] ?? []) as Record<string, unknown>[];
    return {
      id: pub.id,
      contenu: pub.contenu,
      communaute_id: pub.communaute_id,
      user: pub.user,
      commentaires_count: pub.commentaires_count ?? 0,
      reactions: reactions.map((rc) => ({
        reaction_type_id: rc.reaction_type_id,
        code: rc.code,
        emoji: rc.emoji,
        count: rc.count,
      })),
      hashtags: hashtags
        .filter((ph) => ph.hashtag)
        .map((ph) => ({
          id: (ph.hashtag as Record<string, unknown>).id,
          libelle: (ph.hashtag as Record<string, unknown>).libelle,
        })),
      created_at: pub.created_at,
      updated_at: pub.updated_at,
      images: ((pub.publication_media as unknown[] ?? []) as Record<string, unknown>[]).map(
        (m) => ({
          id: m.id,
          file_path: m.file_path,
          ordre: m.ordre,
        }),
      ),
    };
  }


}
