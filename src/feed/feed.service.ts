import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
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

    if (query.hashtag_id) {
      where.publication_hashtag = {
        some: { hashtag_id: query.hashtag_id },
      };
    }

    const [publications, total] = await Promise.all([
      this.prisma.publication.findMany({
        where,
        include: {
          user: { select: authorSelect },
          publication_reaction_count: {
            include: { reaction_type: { select: { id: true, code: true, emoji: true } } },
          },
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

    return {
      data: publications.map((p) => this.formatPublication(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id, is_deleted: false },
      include: {
        user: { select: authorSelect },
        publication_reaction_count: {
          include: { reaction_type: { select: { id: true, code: true, emoji: true } } },
        },
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

    return {
      ...this.formatPublication(pub),
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

        await this.prisma.$executeRawUnsafe(
          `UPDATE publication_reaction_count SET count = count - 1 WHERE publication_id = $1 AND reaction_type_id = $2`,
          publicationId,
          reactionTypeId,
        );

        return { toggled: 'off', reaction_type_id: reactionTypeId, counts: await this.getReactions(publicationId) };
      }

      const oldTypeId = existing.reaction_type_id;
      await this.prisma.reaction.update({
        where: { user_id_publication_id: { user_id: userId, publication_id: publicationId } },
        data: { reaction_type_id: reactionTypeId, created_at: new Date() },
      });

      await this.prisma.$executeRawUnsafe(
        `UPDATE publication_reaction_count SET count = count - 1 WHERE publication_id = $1 AND reaction_type_id = $2`,
        publicationId,
        oldTypeId,
      );
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO publication_reaction_count (publication_id, reaction_type_id, count) VALUES ($1, $2, 1) ON CONFLICT (publication_id, reaction_type_id) DO UPDATE SET count = publication_reaction_count.count + 1`,
        publicationId,
        reactionTypeId,
      );

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

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO publication_reaction_count (publication_id, reaction_type_id, count) VALUES ($1, $2, 1) ON CONFLICT (publication_id, reaction_type_id) DO UPDATE SET count = publication_reaction_count.count + 1`,
      publicationId,
      reactionTypeId,
    );

    return { toggled: 'on', reaction_type_id: reactionTypeId, counts: await this.getReactions(publicationId) };
  }

  async getReactions(publicationId: number) {
    const pub = await this.prisma.publication.findFirst({
      where: { id: publicationId, is_deleted: false },
    });

    if (!pub) {
      throw new NotFoundException('Publication introuvable');
    }

    const counts = await this.prisma.publication_reaction_count.findMany({
      where: { publication_id: publicationId },
      include: { reaction_type: { select: { id: true, libelle: true, emoji: true, code: true } } },
    });

    return counts.map((c) => ({
      reaction_type_id: c.reaction_type_id,
      libelle: c.reaction_type.libelle,
      emoji: c.reaction_type.emoji,
      code: c.reaction_type.code,
      count: c.count ?? 0,
    }));
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

  private formatPublication(pub: Record<string, unknown>) {
    const reactions = (pub.publication_reaction_count as unknown[] ?? []) as Record<string, unknown>[];
    const hashtags = (pub.publication_hashtag as unknown[] ?? []) as Record<string, unknown>[];
    return {
      id: pub.id,
      contenu: pub.contenu,
      communaute_id: pub.communaute_id,
      user: pub.user,
      commentaires_count: pub.commentaires_count ?? 0,
      reactions: reactions.map((rc) => ({
        reaction_type_id: rc.reaction_type_id,
        code: (rc.reaction_type as Record<string, unknown>)?.code,
        emoji: (rc.reaction_type as Record<string, unknown>)?.emoji,
        count: rc.count ?? 0,
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
