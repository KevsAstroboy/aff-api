import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
    let inheritedEvent: Record<string, unknown> | null = null;

    if (dto.evenement_id !== undefined) {
      inheritedEvent = (await this.prisma.programme_evenement.findFirst({
        where: { id: dto.evenement_id, is_deleted: false },
      })) as Record<string, unknown> | null;
      if (!inheritedEvent) {
        throw new NotFoundException('Événement introuvable');
      }

      const exists = await this.prisma.masterclass.findFirst({
        where: { evenement_id: dto.evenement_id, is_deleted: false },
      });
      if (exists) {
        throw new ConflictException('Une masterclass existe déjà pour cet événement');
      }
    }

    const maxRecord = await this.prisma.masterclass.findFirst({
      where: {},
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    // Lieu hérité depuis l'événement si non fourni
    let lieuId = dto.lieu_id;
    if (lieuId === undefined && inheritedEvent) {
      lieuId = (inheritedEvent.lieu_id as number) ?? null;
    }

    const newId = (maxRecord?.id ?? 0) + 1;
    const now = new Date();

    const mc = await this.prisma.masterclass.create({
      data: {
        id: newId,
        evenement_id: dto.evenement_id ?? null,
        communaute_id: dto.communaute_id,
        mode_diffusion_id: dto.mode_diffusion_id,
        titre: dto.titre ?? (inheritedEvent?.titre as string | null) ?? null,
        description: dto.description ?? (inheritedEvent?.description as string | null) ?? null,
        jour: dto.jour ? new Date(dto.jour) : (inheritedEvent?.jour as Date | null) ?? null,
        heure_debut: dto.heure_debut
          ? this.parseTimeToDate(dto.heure_debut)
          : (inheritedEvent?.heure_debut as Date | null) ?? null,
        heure_fin: dto.heure_fin
          ? this.parseTimeToDate(dto.heure_fin)
          : (inheritedEvent?.heure_fin as Date | null) ?? null,
        lieu_id: lieuId,
        meeting_url: dto.meeting_url,
        expert: dto.expert,
        max_participants: dto.max_participants,
        statut_id: 1,
        created_at: now,
        updated_at: now,
      },
      include: {
        mode_diffusion: true,
        communaute: true,
        lieu: true,
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

    if (dto.statut_id !== undefined && ![1, 2, 3, 4].includes(dto.statut_id)) {
      throw new BadRequestException('Statut de masterclass invalide');
    }

    const updated = await this.prisma.masterclass.update({
      where: { id },
      data: {
        ...dto,
        jour: dto.jour !== undefined ? new Date(dto.jour) : undefined,
        heure_debut: dto.heure_debut !== undefined ? this.parseTimeToDate(dto.heure_debut) : undefined,
        heure_fin: dto.heure_fin !== undefined ? this.parseTimeToDate(dto.heure_fin) : undefined,
        updated_at: new Date(),
      },
      include: {
        mode_diffusion: true,
        communaute: true,
        lieu: true,
        programme_evenement: {
          include: { type_evenement: true },
        },
      },
    });

    return this.formatMasterclass(updated);
  }

  async removeMasterclass(id: number) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id, is_deleted: false },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }

    await this.prisma.masterclass.update({
      where: { id },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return { message: 'Masterclass supprimée' };
  }

  // ─── Inscriptions ─────────────────────────────────────────────

  async inscribe(userId: number, masterclassId: number, _dto: CreateInscriptionDto) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id: masterclassId, is_deleted: false },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }

    if (mc.max_participants && (mc.participants_count ?? 0) >= mc.max_participants) {
      throw new ConflictException('Masterclass complète');
    }

    const existing = await this.prisma.masterclass_inscription.findFirst({
      where: { masterclass_id: masterclassId, user_id: userId },
    });

    // Déjà inscrit actif → idempotent, renvoyer l'existant
    if (existing && !existing.is_deleted) {
      return existing;
    }

    // Inscription soft-deletée → la réactiver (contrainte UNIQUE globale)
    if (existing) {
      const reactivated = await this.prisma.masterclass_inscription.update({
        where: { id: existing.id },
        data: { is_deleted: false, role_id: 3, inscrit_at: new Date() },
      });
      return reactivated;
    }

    const inscription = await this.prisma.masterclass_inscription.create({
      data: {
        masterclass_id: masterclassId,
        user_id: userId,
        role_id: 3,
        inscrit_at: new Date(),
      },
    });

    return inscription;
  }

  async getMyInscriptions(userId: number) {
    return this.prisma.masterclass_inscription.findMany({
      where: { user_id: userId, is_deleted: false },
      include: {
        masterclass: {
          include: {
            programme_evenement: {
              include: { lieu: true, type_evenement: true },
            },
            mode_diffusion: true,
          },
        },
      } as any,
      orderBy: { inscrit_at: 'desc' },
    });
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

  async getMasterclassesByCriteria(
    query: Record<string, string>,
  ): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('masterclass');
    const { where, orderBy, skip, take, select, include } = builder.build(
      criteria,
    );

    const hasStatutCriterion = criteria.criteria.some(
      (c) => c.field === 'statut_id',
    );

    const baseWhere: Record<string, unknown> = { is_deleted: false };

    // Filtre édition (relation programme_evenement.edition_id) — hors DSL,
    // la DSL ne parcourt pas les relations imbriquées.
    if (query.edition_id) {
      const editionId = parseInt(query.edition_id, 10);
      if (!isNaN(editionId)) {
        baseWhere.programme_evenement = { edition_id: editionId };
      }
    }

    // Par défaut, exclure Terminée (3) + Annulée (4) sur la liste publique
    if (!hasStatutCriterion) {
      baseWhere.statut_id = { notIn: [3, 4] };
    }

    const combinedWhere = { AND: [where, baseWhere] };

    const [items, total] = await Promise.all([
      this.prisma.masterclass.findMany({
        where: combinedWhere,
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.masterclass.count({ where: combinedWhere }),
    ]);

    const unknownItems = items as Record<string, unknown>[];
    const evenementIds = unknownItems
      .map((i) => (i.programme_evenement as Record<string, unknown> | null)?.id as number | undefined)
      .filter((id): id is number => !!id);

    if (evenementIds.length > 0) {
      const lieux = await this.prisma.programme_evenement.findMany({
        where: { id: { in: evenementIds } },
        select: { id: true, lieu: { select: { id: true, libelle: true } } },
      });
      const lieuByEvent = new Map(lieux.map((l) => [l.id, l.lieu]));
      for (const i of unknownItems) {
        const ev = i.programme_evenement as Record<string, unknown> | null;
        if (ev?.id != null) {
          (ev as Record<string, unknown>).lieu = lieuByEvent.get(ev.id as number) ?? null;
        }
      }
    }

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private parseTimeToDate(time: string): Date {
    const d = new Date();
    const [h, m, s] = time.split(':');
    const hour = parseInt(h, 10);
    const min = parseInt(m, 10);
    const sec = s && s.trim() !== '' ? parseInt(s, 10) : 0;
    d.setHours(
      isNaN(hour) ? 0 : hour,
      isNaN(min) ? 0 : min,
      isNaN(sec) ? 0 : sec,
      0,
    );
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
      expert: mc.expert ?? null,
      titre: mc.titre ?? null,
      description: mc.description ?? null,
      jour: mc.jour ?? null,
      heure_debut: mc.heure_debut ?? null,
      heure_fin: mc.heure_fin ?? null,
      lieu_id: mc.lieu_id ?? null,
      lieu: mc.lieu || undefined,
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

  // ─── Billet (PDF + QR) ────────────────────────────────────────

  private async getInscription(userId: number, masterclassId: number) {
    const inscription = await this.prisma.masterclass_inscription.findFirst({
      where: { masterclass_id: masterclassId, user_id: userId, is_deleted: false },
    });
    if (!inscription) {
      throw new ForbiddenException(
        "Vous devez être inscrit pour accéder au billet de cette masterclass",
      );
    }
    return inscription;
  }

  private async buildBilletContext(userId: number, masterclassId: number) {
    const mc = await this.prisma.masterclass.findFirst({
      where: { id: masterclassId, is_deleted: false },
      include: {
        programme_evenement: {
          include: { lieu: true, edition: true },
        },
        mode_diffusion: true,
        communaute: true,
        lieu: true,
        statut_masterclass: true,
      },
    });
    if (!mc) {
      throw new NotFoundException('Masterclass introuvable');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true, email: true, username: true },
    });
    const ev = mc.programme_evenement as any;
    const fmtTime = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const s = String(d);
      return s.length >= 5 ? s.slice(0, 5) : s || null;
    };
    const fmtDate = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date)
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return String(d).slice(0, 10);
    };
    const titre = mc.titre ?? ev?.titre ?? null;
    const heureDebut = fmtTime(mc.heure_debut ?? ev?.heure_debut);
    const heureFin = fmtTime(mc.heure_fin ?? ev?.heure_fin);
    const jour = fmtDate(mc.jour ?? ev?.jour);
    const lieuLib = mc.lieu?.libelle ?? ev?.lieu?.libelle ?? null;
    const codePayload = JSON.stringify({
      t: 'aff-masterclass',
      mc: mc.id,
      u: userId,
      titre,
      jour: mc.jour ?? ev?.jour ?? null,
      heure: heureDebut,
      lieu: lieuLib,
      meeting: mc.meeting_url ?? null,
    });
    const qrDataUrl = await QRCode.toDataURL(codePayload, {
      width: 220,
      margin: 1,
    });
    const fullname =
      [user?.prenom, user?.nom].filter(Boolean).join(' ') ||
      user?.username ||
      user?.email ||
      `Utilisateur ${userId}`;
    return {
      mc,
      ev,
      titre,
      user,
      fullname,
      qrDataUrl,
      heureDebut,
      heureFin,
      lieuLib,
      jour,
    };
  }

  async getBillet(userId: number, masterclassId: number) {
    await this.getInscription(userId, masterclassId);
    const {
      mc,
      ev,
      titre,
      fullname,
      qrDataUrl,
      heureDebut,
      heureFin,
      lieuLib,
      jour,
    } = await this.buildBilletContext(userId, masterclassId);
    return {
      masterclass_id: mc.id,
      titre: titre ?? 'Masterclass',
      expert: mc.expert ?? null,
      date: jour ?? null,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      lieu: lieuLib,
      mode: mc.mode_diffusion?.libelle ?? null,
      meeting_url: mc.meeting_url ?? null,
      communaute: mc.communaute?.libelle ?? null,
      edition: ev?.edition?.nom ?? null,
      participant: fullname,
      participants_count: mc.participants_count ?? 0,
      max_participants: mc.max_participants ?? null,
      qr: qrDataUrl,
    };
  }

  async getBilletPdf(userId: number, masterclassId: number): Promise<Buffer> {
    await this.getInscription(userId, masterclassId);
    const {
      mc,
      ev,
      titre,
      fullname,
      qrDataUrl,
      heureDebut,
      heureFin,
      lieuLib,
      jour,
    } = await this.buildBilletContext(userId, masterclassId);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const GOLD = rgb(0.82, 0.62, 0.18);
    const GOLD_PALE = rgb(0.9, 0.76, 0.35);
    const DARK = rgb(0.13, 0.13, 0.15);
    const GRAY = rgb(0.5, 0.5, 0.52);
    const LIGHT = rgb(0.95, 0.95, 0.95);

    const page = doc.addPage([1200, 660]); // paysage, billet scannable
    const W = page.getWidth();
    const H = page.getHeight();
    const M = 55;

    // ── Bandeau supérieur (fond sombre) ──
    const headTop = H;          // 660
    const headBottom = 505;     // fond sombre 505..660
    page.drawRectangle({ x: 0, y: headBottom, width: W, height: headTop - headBottom, color: rgb(0.07, 0.07, 0.09) });

    // Logo spiral : cercles concentriques (centré dans le bandeau)
    const cx = 165;
    const cy = headBottom + 80;
    page.drawCircle({ x: cx, y: cy, size: 55, color: GOLD });
    page.drawCircle({ x: cx, y: cy, size: 38, color: rgb(0.07, 0.07, 0.09) });
    page.drawCircle({ x: cx, y: cy, size: 15, color: GOLD });

    // Marque + sous-titre à côté du logo
    page.drawText('AFRICA FUTURE FESTIVAL', { x: 250, y: headBottom + 92, size: 15, font: bold, color: rgb(0.98, 0.98, 0.98) });
    page.drawText('ABIDJAN · ÉDITION 2026 — BILLET D’ACCÈS', { x: 250, y: headBottom + 68, size: 9, font, color: GOLD_PALE });

    // Intitulé du billet, à droite du bandeau
    page.drawText('BILLET OFFICIEL', { x: 950, y: headBottom + 92, size: 13, font: bold, color: GOLD_PALE });
    page.drawText('MASTERCLASS', { x: 1040, y: headBottom + 68, size: 10, font: font, color: rgb(0.98, 0.98, 0.98) });

    // ── Corps (fond blanc) : séparateur + titre ──
    page.drawLine({ start: { x: M, y: 505 }, end: { x: W - M, y: 505 }, thickness: 2, color: GOLD });

    page.drawText('MASTERCLASS OFFICIELLE', { x: M, y: 455, size: 10, font: bold, color: GOLD });
    // Titre (très long possible → troncature)
    const fullTitre = titre ?? ev?.titre ?? 'Masterclass';
    const titreTronque = fullTitre.length > 58 ? fullTitre.slice(0, 57) + '…' : fullTitre;
    page.drawText(titreTronque, { x: M, y: 400, size: 26, font: bold, color: DARK });

    // ── Grille d'informations (2 rangées × 3 colonnes) ──
    const row1 = (t: string, v: string, x: number) => {
      page.drawText(t.toUpperCase(), { x, y: 300, size: 8, font: bold, color: GOLD });
      page.drawText(v, { x, y: 272, size: 14, font: bold, color: DARK });
    };
    row1('Expert', mc.expert ?? 'À annoncer', M);
    row1('Date', jour ?? '—', 400);
    row1('Horaire', `${heureDebut ?? '—'} — ${heureFin ?? ''}`.trim(), 700);

    const row2 = (t: string, v: string, x: number) => {
      page.drawText(t.toUpperCase(), { x, y: 205, size: 8, font: bold, color: GOLD });
      page.drawText(v, { x, y: 177, size: 13, font: bold, color: DARK });
    };
    row2('Participant', fullname, M);
    row2('Modalité', mc.mode_diffusion?.libelle ?? '—', 400);
    row2('Lieu / Visio', lieuLib ?? mc.meeting_url ?? '—', 700);

    // ── QR code à droite ──
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await doc.embedPng(qrBuffer);
    const qrSize = 130;
    const qrX = W - M - qrSize;
    const qrY = 150;
    page.drawRectangle({ x: qrX - 14, y: qrY - 14, width: qrSize + 28, height: qrSize + 28, color: LIGHT });
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    // ── Footer ──
    page.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 1, color: GOLD });
    page.drawText("Présentez ce billet à l'accueil avec une pièce d'identité.", { x: M, y: 45, size: 9, font, color: GRAY });
    page.drawText(`Billet ${mc.id} · émis le ${new Date().toLocaleDateString('fr-FR')}`, { x: W - M - 260, y: 45, size: 8, font, color: GRAY });

    return Buffer.from(await doc.save());
  }
}
