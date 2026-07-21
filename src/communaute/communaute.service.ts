import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreateCommunauteDto } from './dto/create-communaute.dto';
import { UpdateCommunauteDto } from './dto/update-communaute.dto';

@Injectable()
export class CommunauteService {
  private readonly logger = new Logger(CommunauteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.communaute.findMany({
      where: { is_deleted: false },
      orderBy: { libelle: 'asc' },
    });
  }

  async findOne(id: number) {
    const communaute = await this.prisma.communaute.findFirst({
      where: { id, is_deleted: false },
    });

    if (!communaute) {
      throw new NotFoundException('Communaute introuvable');
    }

    return communaute;
  }

  async create(dto: CreateCommunauteDto, userId: number) {
    const maxRecord = await this.prisma.communaute.findFirst({
      where: {},
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = (maxRecord?.id ?? 0) + 1;

    const now = new Date();

    return this.prisma.communaute.create({
      data: {
        id: newId,
        libelle: dto.libelle,
        code: dto.code,
        description: dto.description,
        couleur: dto.couleur,
        icon_path: dto.icon_path,
        is_active: true,
          created_at: now,
          created_by: userId,
      },
    });
  }

  async update(id: number, dto: UpdateCommunauteDto, userId: number) {
    await this.findOne(id);

    return this.prisma.communaute.update({
      where: { id },
      data: {
        ...dto,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id);

    return this.prisma.communaute.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async subscribe(userId: number, communauteId: number) {
    await this.findOne(communauteId);

    const existing = await this.prisma.user_communaute.findFirst({
      where: {
        user_id: userId,
        communaute_id: communauteId,
        is_deleted: false,
      },
    });

    if (existing) {
      throw new ConflictException('Déjà abonné à cette communaute');
    }

    return this.prisma.user_communaute.create({
      data: {
        user_id: userId,
        communaute_id: communauteId,
        joined_at: new Date(),
      },
    });
  }

  async unsubscribe(userId: number, communauteId: number) {
    await this.findOne(communauteId);

    const subscription = await this.prisma.user_communaute.findFirst({
      where: {
        user_id: userId,
        communaute_id: communauteId,
        is_deleted: false,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }

    return this.prisma.user_communaute.update({
      where: { id: subscription.id },
      data: { is_deleted: true },
    });
  }

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('communaute');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.communaute.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.communaute.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }
}
