import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { CreateEditionDto } from './dto/create-edition.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';

const statutSelect = {
  id: true,
  libelle: true,
  code: true,
};

const STATUT_EN_COURS = 3;

@Injectable()
export class EditionService {
  private readonly logger = new Logger(EditionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.edition.findMany({
      where: { is_deleted: false },
      include: { statut_edition: { select: statutSelect } },
      orderBy: { annee: 'desc' },
    });
  }

  async findOne(id: number) {
    const edition = await this.prisma.edition.findFirst({
      where: { id, is_deleted: false },
      include: { statut_edition: { select: statutSelect } },
    });

    if (!edition) {
      throw new NotFoundException('Edition introuvable');
    }

    return edition;
  }

  async findCurrent() {
    const current = await this.prisma.edition.findFirst({
      where: { statut_id: STATUT_EN_COURS, is_deleted: false },
      include: { statut_edition: { select: statutSelect } },
      orderBy: { annee: 'desc' },
    });

    if (current) return current;

    const latest = await this.prisma.edition.findFirst({
      where: { is_deleted: false },
      include: { statut_edition: { select: statutSelect } },
      orderBy: { annee: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException('Aucune édition trouvée');
    }

    return latest;
  }

  async create(dto: CreateEditionDto, userId: number) {
    const now = new Date();

    return this.prisma.edition.create({
      data: {
        annee: dto.annee,
        nom: dto.nom,
        ville: dto.ville,
        lieu: dto.lieu,
        date_debut: dto.date_debut ? new Date(dto.date_debut) : undefined,
        date_fin: dto.date_fin ? new Date(dto.date_fin) : undefined,
        candidature_deadline: dto.candidature_deadline ? new Date(dto.candidature_deadline) : undefined,
        ceremonie_date: dto.ceremonie_date ? new Date(dto.ceremonie_date) : undefined,
        statut_id: dto.statut_id ?? 1,
          created_by: userId,
          created_at: now,
      },
      include: { statut_edition: { select: statutSelect } },
    });
  }

  async update(id: number, dto: UpdateEditionDto) {
    await this.findOne(id);

    const data: { updated_at: Date; [key: string]: unknown } = { updated_at: new Date() };

    if (dto.annee !== undefined) data.annee = dto.annee;
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.ville !== undefined) data.ville = dto.ville;
    if (dto.lieu !== undefined) data.lieu = dto.lieu;
    if (dto.date_debut !== undefined) data.date_debut = new Date(dto.date_debut);
    if (dto.date_fin !== undefined) data.date_fin = new Date(dto.date_fin);
    if (dto.candidature_deadline !== undefined) data.candidature_deadline = new Date(dto.candidature_deadline);
    if (dto.ceremonie_date !== undefined) data.ceremonie_date = new Date(dto.ceremonie_date);
    if (dto.statut_id !== undefined) data.statut_id = dto.statut_id;

    return this.prisma.edition.update({
      where: { id },
      data,
      include: { statut_edition: { select: statutSelect } },
    });
  }

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('edition');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.edition.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.edition.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.edition.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
      include: { statut_edition: { select: statutSelect } },
    });
  }
}
