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
import { CreateEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { CreateMasterclassDto } from './dto/create-masterclass.dto';
import { CreateInscriptionDto } from './dto/create-inscription.dto';

@Injectable()
export class ProgrammeService {
  private readonly logger = new Logger(ProgrammeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Événements ───────────────────────────────────────────────

  async findAll(filters: {
    edition_id?: number;
    jour?: string;
    type_evenement_id?: number;
    page?: number;
    limit?: number;
  }) {
    const { edition_id, jour, type_evenement_id, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { is_deleted: false };

    if (edition_id) where.edition_id = edition_id;
    if (type_evenement_id) where.type_evenement_id = type_evenement_id;
    if (jour) {
      where.jour = new Date(jour);
    }

    const [data, total] = await Promise.all([
      this.prisma.programme_evenement.findMany({
        where,
        include: {
          type_evenement: true,
          lieu: true,
          edition: true,
        },
        orderBy: [{ jour: 'asc' }, { heure_debut: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.programme_evenement.count({ where }),
    ]);

    return {
      data: data.map((e) => this.formatEvenement(e, false)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, userId?: number) {
    const event = await this.prisma.programme_evenement.findFirst({
      where: { id, is_deleted: false },
      include: {
        type_evenement: true,
        lieu: true,
        edition: true,
        masterclass: {
          where: { is_deleted: false },
          include: {
            mode_diffusion: true,
            communaute: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Événement introuvable');
    }

    let is_favori = false;
    if (userId) {
      const fav = await this.prisma.favori_programme.findFirst({
        where: {
          user_id: userId,
          evenement_id: id,
          is_deleted: false,
        },
      });
      is_favori = !!fav;
    }

    return this.formatEvenement(event, is_favori);
  }

  async getByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('programme_evenement');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.programme_evenement.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.programme_evenement.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async create(dto: CreateEvenementDto) {
    const maxRecord = await this.prisma.programme_evenement.findFirst({
      where: {},
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = (maxRecord?.id ?? 0) + 1;
    const now = new Date();

    const event = await this.prisma.programme_evenement.create({
      data: {
        id: newId,
        edition_id: dto.edition_id,
        type_evenement_id: dto.type_evenement_id,
        titre: dto.titre,
        description: dto.description,
        jour: new Date(dto.jour),
        heure_debut: this.parseTimeToDate(dto.heure_debut),
        heure_fin: this.parseTimeToDate(dto.heure_fin),
        lieu_id: dto.lieu_id,
        is_hot: dto.is_hot ?? false,
        created_at: now,
        updated_at: now,
      },
      include: {
        type_evenement: true,
        lieu: true,
        edition: true,
      },
    });

    return this.formatEvenement(event, false);
  }

  async update(id: number, dto: UpdateEvenementDto) {
    const existing = await this.prisma.programme_evenement.findFirst({
      where: { id, is_deleted: false },
    });
    if (!existing) {
      throw new NotFoundException('Événement introuvable');
    }

    const data: Record<string, unknown> = { ...dto, updated_at: new Date() };

    if (dto.jour) data.jour = new Date(dto.jour);
    if (dto.heure_debut) data.heure_debut = this.parseTimeToDate(dto.heure_debut);
    if (dto.heure_fin) data.heure_fin = this.parseTimeToDate(dto.heure_fin);

    const event = await this.prisma.programme_evenement.update({
      where: { id },
      data,
      include: {
        type_evenement: true,
        lieu: true,
        edition: true,
      },
    });

    return this.formatEvenement(event, false);
  }

  async remove(id: number) {
    const existing = await this.prisma.programme_evenement.findFirst({
      where: { id, is_deleted: false },
    });
    if (!existing) {
      throw new NotFoundException('Événement introuvable');
    }

    const now = new Date();
    await this.prisma.programme_evenement.update({
      where: { id },
      data: { is_deleted: true, updated_at: now },
    });

    await this.prisma.masterclass.updateMany({
      where: { evenement_id: id },
      data: { is_deleted: true, updated_at: now },
    });

    return { message: 'Événement supprimé' };
  }

  // ─── Masterclass ──────────────────────────────────────────────

  async createMasterclass(dto: CreateMasterclassDto) {
    const event = await this.prisma.programme_evenement.findFirst({
      where: { id: dto.evenement_id, is_deleted: false },
    });
    if (!event) {
      throw new NotFoundException('Événement introuvable');
    }

    const exists = await this.prisma.masterclass.findFirst({
      where: { evenement_id: dto.evenement_id, is_deleted: false },
    });
    if (exists) {
      throw new ConflictException('Une masterclass existe déjà pour cet événement');
    }

    const maxRecord = await this.prisma.masterclass.findFirst({
      where: {},
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = (maxRecord?.id ?? 0) + 1;
    const now = new Date();

    const mc = await this.prisma.masterclass.create({
      data: {
        id: newId,
        evenement_id: dto.evenement_id,
        communaute_id: dto.communaute_id,
        mode_diffusion_id: dto.mode_diffusion_id,
        meeting_url: dto.meeting_url,
        max_participants: dto.max_participants,
        statut_id: 1,
        created_at: now,
        updated_at: now,
      },
      include: {
        mode_diffusion: true,
        communaute: true,
        programme_evenement: {
          include: { type_evenement: true },
        },
      },
    });

    return this.formatMasterclass(mc);
  }

  async findMasterclassByEvenement(evenementId: number) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { evenement_id: evenementId, is_deleted: false },
      include: {
        mode_diffusion: true,
        communaute: true,
        programme_evenement: {
          include: { type_evenement: true },
        },
        masterclass_inscription: {
          where: { is_deleted: false },
          include: {
            masterclass_role: true,
            user: { select: { id: true, prenom: true, nom: true, email: true } },
          },
        },
      },
    });

    if (!mc) {
      throw new NotFoundException('Masterclass introuvable pour cet événement');
    }

    return this.formatMasterclassDetail(mc);
  }

  async updateMasterclass(id: number, dto: Partial<CreateMasterclassDto>) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id, is_deleted: false },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }

    const updated = await this.prisma.masterclass.update({
      where: { id },
      data: { ...dto, updated_at: new Date() },
      include: {
        mode_diffusion: true,
        communaute: true,
        programme_evenement: {
          include: { type_evenement: true },
        },
      },
    });

    return this.formatMasterclass(updated);
  }

  // ─── Inscriptions ─────────────────────────────────────────────

  async inscribe(userId: number, masterclassId: number, dto: CreateInscriptionDto) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id: masterclassId, is_deleted: false },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }

    if (mc.max_participants && (mc.participants_count ?? 0) >= mc.max_participants) {
      throw new ConflictException('Masterclass complète');
    }

    const inscription = await this.prisma.masterclass_inscription.create({
      data: {
        masterclass_id: masterclassId,
        user_id: userId,
        role_id: dto.role_id,
        inscrit_at: new Date(),
      },
    });

    await this.prisma.masterclass.update({
      where: { id: masterclassId },
      data: {
        participants_count: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return inscription;
  }

  async findInscriptions(masterclassId: number) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id: masterclassId, is_deleted: false },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }

    return this.prisma.masterclass_inscription.findMany({
      where: { masterclass_id: masterclassId, is_deleted: false },
      include: {
        masterclass_role: true,
        user: { select: { id: true, prenom: true, nom: true, email: true } },
      },
      orderBy: { inscrit_at: 'asc' },
    });
  }

  async unsubscribe(userId: number, masterclassId: number) {
    const inscription = await this.prisma.masterclass_inscription.findFirst({
      where: {
        masterclass_id: masterclassId,
        user_id: userId,
        is_deleted: false,
      },
    });

    if (!inscription) {
      throw new NotFoundException('Inscription introuvable');
    }

    await this.prisma.masterclass_inscription.update({
      where: { id: inscription.id },
      data: { is_deleted: true },
    });

    await this.prisma.masterclass.update({
      where: { id: masterclassId },
      data: {
        participants_count: { decrement: 1 },
        updated_at: new Date(),
      },
    });

    return { message: 'Désinscription réussie' };
  }

  // ─── Favoris ──────────────────────────────────────────────────

  async toggleFavori(userId: number, evenementId: number) {
    const event = await this.prisma.programme_evenement.findFirst({
      where: { id: evenementId, is_deleted: false },
    });
    if (!event) {
      throw new NotFoundException('Événement introuvable');
    }

    const existing = await this.prisma.favori_programme.findFirst({
      where: { user_id: userId, evenement_id: evenementId },
    });

    if (existing) {
      if (existing.is_deleted) {
        await this.prisma.favori_programme.update({
          where: { id: existing.id },
          data: { is_deleted: false, created_at: new Date() },
        });
        return { is_favori: true, message: 'Ajouté aux favoris' };
      } else {
        await this.prisma.favori_programme.update({
          where: { id: existing.id },
          data: { is_deleted: true },
        });
        return { is_favori: false, message: 'Retiré des favoris' };
      }
    }

    await this.prisma.favori_programme.create({
      data: {
        user_id: userId,
        evenement_id: evenementId,
        created_at: new Date(),
      },
    });
    return { is_favori: true, message: 'Ajouté aux favoris' };
  }

  async getFavoris(userId: number) {
    const favoris = await this.prisma.favori_programme.findMany({
      where: { user_id: userId, is_deleted: false },
      include: {
        programme_evenement: {
          include: {
            type_evenement: true,
            lieu: true,
            edition: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return favoris
      .filter((f) => f.programme_evenement)
      .map((f) => this.formatEvenement(f.programme_evenement!, true));
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private parseTimeToDate(time: string): Date {
    const d = new Date();
    const [h, m, s] = time.split(':');
    d.setHours(parseInt(h, 10), parseInt(m, 10), parseInt(s, 10), 0);
    return d;
  }

  private formatEvenement(
    e: Record<string, unknown>,
    is_favori: boolean,
  ) {
    const masterclassData = e.masterclass;
    let formattedMasterclass: unknown;
    if (masterclassData) {
      if (Array.isArray(masterclassData)) {
        formattedMasterclass = this.formatMasterclass(masterclassData[0] as Record<string, unknown>);
      } else {
        formattedMasterclass = this.formatMasterclass(masterclassData as Record<string, unknown>);
      }
    }
    return {
      id: e.id,
      edition_id: e.edition_id,
      type_evenement_id: e.type_evenement_id,
      titre: e.titre,
      description: e.description,
      jour: e.jour ?? null,
      heure_debut: e.heure_debut ?? null,
      heure_fin: e.heure_fin ?? null,
      lieu_id: e.lieu_id,
      is_hot: e.is_hot,
      is_favori,
      created_at: e.created_at,
      type_evenement: e.type_evenement || undefined,
      lieu: e.lieu || undefined,
      edition: e.edition || undefined,
      masterclass: formattedMasterclass ?? undefined,
    };
  }

  private formatMasterclass(mc: Record<string, unknown>) {
    if (!mc) return undefined;
    return {
      id: mc.id,
      communaute_id: mc.communaute_id,
      mode_diffusion_id: mc.mode_diffusion_id,
      meeting_url: mc.meeting_url,
      max_participants: mc.max_participants,
      participants_count: mc.participants_count,
      mode_diffusion: mc.mode_diffusion || undefined,
      communaute: mc.communaute || undefined,
    };
  }

  private formatMasterclassDetail(mc: Record<string, unknown>) {
    const base = this.formatMasterclass(mc);
    const inscriptions = (mc.masterclass_inscription as unknown[] ?? []) as Record<string, unknown>[];
    const evenement = mc.programme_evenement as Record<string, unknown> | undefined;
    return {
      ...base,
      evenement_id: mc.evenement_id,
      statut_id: mc.statut_id,
      created_at: mc.created_at,
      updated_at: mc.updated_at,
      evenement_titre: evenement?.titre,
      evenement_jour: evenement?.jour
        ? evenement.jour
        : null,
      inscriptions: inscriptions.map((ins) => ({
        id: ins.id,
        user_id: ins.user_id,
        role_id: ins.role_id,
        role_libelle: (ins.masterclass_role as Record<string, unknown>)?.libelle,
        inscrit_at: ins.inscrit_at,
        user_prenom: (ins.user as Record<string, unknown>)?.prenom,
        user_nom: (ins.user as Record<string, unknown>)?.nom,
        user_email: (ins.user as Record<string, unknown>)?.email,
      })),
    };
  }

}
