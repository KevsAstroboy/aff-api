import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';
import { Prisma } from '@prisma/client';

const signaleurSelect = {
  id: true,
  username: true,
  nom: true,
  prenom: true,
  profile_picture_path: true,
  is_officiel: true,
};

const includeRelations = {
  user_signalement_signale_par_user_idTouser: { select: signaleurSelect },
  user_signalement_resolu_par_user_idTouser: { select: signaleurSelect },
  cible_type: { select: { id: true, libelle: true, code: true } },
  severite: { select: { id: true, libelle: true, code: true } },
  statut_signalement: { select: { id: true, libelle: true, code: true } },
};

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateSignalementDto) {
    const signalement = await this.prisma.signalement.create({
      data: {
        cible_type_id: dto.cible_type_id,
        cible_id: dto.cible_id,
        signale_par_user_id: userId,
        motif: dto.motif,
        severite_id: dto.severite_id,
        statut_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: includeRelations,
    });

    return this.formatSignalement(signalement);
  }

  async findAll(filters: {
    statut_id?: number;
    cible_type_id?: number;
    severite_id?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.signalementWhereInput = {
      is_deleted: false,
    };

    if (filters.statut_id) {
      where.statut_id = filters.statut_id;
    }

    if (filters.cible_type_id) {
      where.cible_type_id = filters.cible_type_id;
    }

    if (filters.severite_id) {
      where.severite_id = filters.severite_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where,
        include: includeRelations,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.signalement.count({ where }),
    ]);

    return {
      data: data.map((s) => this.formatSignalement(s)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const signalement = await this.prisma.signalement.findFirst({
      where: { id, is_deleted: false },
      include: includeRelations,
    });

    if (!signalement) {
      throw new NotFoundException('Signalement introuvable');
    }

    return this.formatSignalement(signalement);
  }

  async resolve(id: number, userId: number, dto: UpdateSignalementDto) {
    const signalement = await this.prisma.signalement.findFirst({
      where: { id, is_deleted: false },
    });

    if (!signalement) {
      throw new NotFoundException('Signalement introuvable');
    }

    try {
      const updated = await this.prisma.signalement.update({
        where: { id },
        data: {
          statut_id: dto.statut_id,
          resolu_par_user_id: userId,
          resolu_at: dto.statut_id === 2 || dto.statut_id === 3 ? new Date() : signalement.resolu_at,
          updated_at: new Date(),
        },
        include: includeRelations,
      });

      return this.formatSignalement(updated);
    } catch (error) {
      return this.handlePgError(error, 'Résolution signalement');
    }
  }

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('signalement');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.signalement.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  private formatSignalement(s: Record<string, unknown>) {
    return {
      id: s.id,
      cible_type_id: s.cible_type_id,
      cible_id: s.cible_id,
      signale_par_user_id: s.signale_par_user_id,
      motif: s.motif,
      severite_id: s.severite_id,
      statut_id: s.statut_id,
      resolu_par_user_id: s.resolu_par_user_id,
      resolu_at: s.resolu_at ?? null,
      created_at: s.created_at,
      updated_at: s.updated_at,
      signaleur: s.user_signalement_signale_par_user_idTouser,
      resolueur: s.user_signalement_resolu_par_user_idTouser,
      cible_type: s.cible_type,
      severite: s.severite,
      statut: s.statut_signalement,
    };
  }

  private handlePgError(error: unknown, context: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Cible introuvable pour signalement');
      }
    }

    if (error instanceof Error) {
      const msg = (error as any)?.message ?? '';

      if (msg.includes('Cible introuvable pour signalement')) {
        throw new BadRequestException('Cible introuvable pour signalement');
      }

      if (msg.includes('P2003') || msg.includes('foreign key')) {
        throw new BadRequestException('Cible introuvable pour signalement');
      }
    }

    this.logger.error(context, error);
    throw error;
  }
}
