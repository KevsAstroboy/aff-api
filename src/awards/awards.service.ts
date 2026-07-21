import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { JuryVoteDto } from './dto/jury-vote.dto';
import { PublicVoteDto } from './dto/public-vote.dto';

const categoryInclude = {
  award_theme: { select: { id: true, libelle: true, code: true, ordre: true } },
  edition: { select: { id: true, annee: true, nom: true, ville: true } },
};

const candidatureInclude = {
  user: {
    select: {
      id: true,
      username: true,
      nom: true,
      prenom: true,
      profile_picture_path: true,
    },
  },
  award_category: {
    select: { id: true, libelle: true, code: true },
  },
  statut_candidature: {
    select: { id: true, libelle: true, code: true },
  },
  candidature_media: {
    where: { is_deleted: false },
    select: {
      id: true,
      media_type_id: true,
      file_path: true,
      ordre: true,
    },
    orderBy: { ordre: 'asc' as const },
  },
};

@Injectable()
export class AwardsService {
  private readonly logger = new Logger(AwardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAllCategories(edition_id?: number) {
    const where: Record<string, unknown> = { is_deleted: false };
    if (edition_id) {
      where.edition_id = edition_id;
    }

    return this.prisma.award_category.findMany({
      where,
      include: categoryInclude,
      orderBy: { id: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.award_category.create({
      data: {
        edition_id: dto.edition_id,
        theme_id: dto.theme_id,
        libelle: dto.libelle,
        code: dto.code,
        description: dto.description,
        is_grand_prix: dto.is_grand_prix ?? false,
        created_at: new Date(),
      },
      include: categoryInclude,
    });
  }

  async getCategoriesByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('award_category');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.award_category.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.award_category.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.award_category.findFirst({
      where: { id, is_deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return this.prisma.award_category.update({
      where: { id },
      data: {
        ...dto,
      },
      include: categoryInclude,
    });
  }

  async submitCandidature(userId: number, dto: CreateCandidatureDto) {
    const category = await this.prisma.award_category.findFirst({
      where: { id: dto.categorie_id, is_deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const existing = await this.prisma.candidature.findFirst({
      where: { user_id: userId, categorie_id: dto.categorie_id, is_deleted: false },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà soumis une candidature pour cette catégorie');
    }

    return this.prisma.candidature.create({
      data: {
        user_id: userId,
        categorie_id: dto.categorie_id,
        edition_id: dto.edition_id,
        description: dto.description,
        portfolio_url: dto.portfolio_url,
        statut_id: 1,
        submitted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: candidatureInclude,
    });
  }

  async findAllCandidatures(filters: {
    edition_id?: number;
    categorie_id?: number;
    statut_id?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { is_deleted: false };

    if (filters.edition_id) {
      where.edition_id = filters.edition_id;
    }
    if (filters.categorie_id) {
      where.categorie_id = filters.categorie_id;
    }
    if (filters.statut_id) {
      where.statut_id = filters.statut_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.candidature.findMany({
        where,
        include: candidatureInclude,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.candidature.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidaturesByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('candidature');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.candidature.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.candidature.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async findOneCandidature(id: number) {
    const candidature = await this.prisma.candidature.findFirst({
      where: { id, is_deleted: false },
      include: candidatureInclude,
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    return candidature;
  }

  async updateCandidatureStatut(id: number, statut_id: number) {
    const candidature = await this.prisma.candidature.findFirst({
      where: { id, is_deleted: false },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    return this.prisma.candidature.update({
      where: { id },
      data: {
        statut_id,
        updated_at: new Date(),
      },
      include: candidatureInclude,
    });
  }

  async uploadMedia(
    candidatureId: number,
    userId: number,
    file: Express.Multer.File,
    mediaTypeId: number,
  ) {
    const candidature = await this.prisma.candidature.findFirst({
      where: { id: candidatureId, is_deleted: false },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    if (candidature.user_id !== userId) {
      throw new NotFoundException("Vous ne pouvez pas ajouter de médias à cette candidature");
    }

    const bucket = 'awards';
    await this.storage.ensureBucket(bucket);

    const ext = file.originalname.split('.').pop() || 'bin';
    const objectName = `${candidatureId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const filePath = await this.storage.uploadFile(
      bucket,
      objectName,
      file.buffer,
      file.mimetype,
    );

    const maxOrdre = await this.prisma.candidature_media.findFirst({
      where: { candidature_id: candidatureId, is_deleted: false },
      orderBy: { ordre: 'desc' as const },
      select: { ordre: true },
    });

    return this.prisma.candidature_media.create({
      data: {
        candidature_id: candidatureId,
        media_type_id: mediaTypeId,
        file_path: filePath,
        ordre: (maxOrdre?.ordre ?? 0) + 1,
      },
    });
  }

  async submitJuryVote(userId: number, dto: JuryVoteDto) {
    const candidature = await this.prisma.candidature.findFirst({
      where: { id: dto.candidature_id, is_deleted: false },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    const existing = await this.prisma.jury_vote.findFirst({
      where: {
        candidature_id: dto.candidature_id,
        jury_user_id: userId,
        is_deleted: false,
      },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà voté pour cette candidature');
    }

    return this.prisma.jury_vote.create({
      data: {
        candidature_id: dto.candidature_id,
        jury_user_id: userId,
        score: dto.score,
        commentaire: dto.commentaire,
        created_at: new Date(),
      },
    });
  }

  async getJuryResults(categorie_id: number) {
    const category = await this.prisma.award_category.findFirst({
      where: { id: categorie_id, is_deleted: false },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        candidature_id: number;
        user_id: number;
        username: string;
        nom: string;
        prenom: string;
        description: string;
        portfolio_url: string;
        votes_count: number;
        average_score: number;
      }>
    >(
      `SELECT
        c.id AS candidature_id,
        c.user_id,
        u.username,
        u.nom,
        u.prenom,
        c.description,
        c.portfolio_url,
        COUNT(jv.id)::int AS votes_count,
        ROUND(AVG(jv.score)::numeric, 2) AS average_score
      FROM candidature c
      JOIN "user" u ON u.id = c.user_id
      LEFT JOIN jury_vote jv ON jv.candidature_id = c.id AND jv.is_deleted = false
      WHERE c.categorie_id = $1
        AND c.is_deleted = false
      GROUP BY c.id, c.user_id, u.username, u.nom, u.prenom, c.description, c.portfolio_url
      ORDER BY average_score DESC NULLS LAST`,
      categorie_id,
    );

    return results.map((r) => ({
      ...r,
      average_score: r.average_score ? Number(r.average_score) : null,
    }));
  }

  async submitPublicVote(userId: number, dto: PublicVoteDto) {
    const candidature = await this.prisma.candidature.findFirst({
      where: { id: dto.candidature_id, is_deleted: false },
    });

    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }

    const categorieId = candidature.categorie_id;

    if (!categorieId) {
      throw new NotFoundException("La candidature n'est associée à aucune catégorie");
    }

    const existing = await this.prisma.vote_public.findFirst({
      where: {
        user_id: userId,
        categorie_id: categorieId,
        is_deleted: false,
      },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà voté dans cette catégorie');
    }

    return this.prisma.vote_public.create({
      data: {
        candidature_id: dto.candidature_id,
        categorie_id: categorieId,
        user_id: userId,
        voted_at: new Date(),
      },
    });
  }
}
