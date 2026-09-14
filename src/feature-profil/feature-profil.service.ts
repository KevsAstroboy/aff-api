import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfilDto } from './dto/profil.dto';
import { UpdateProfilDto } from './dto/profil.dto';
import { CreateFeatureDto } from './dto/feature.dto';

@Injectable()
export class FeatureProfilService {
  private readonly logger = new Logger(FeatureProfilService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Profils ─────────────────────────────────────────────

  async findAllProfils() {
    return this.prisma.profil.findMany({
      where: { is_deleted: false },
      orderBy: { id: 'asc' },
    });
  }

  async createProfil(dto: CreateProfilDto, createdById: number) {
    return this.prisma.profil.create({
      data: {
        libelle: dto.libelle,
        code: dto.code,
        description: dto.description ?? null,
        niveau: dto.niveau,
        created_at: new Date(),
        created_by: createdById,
      } as any,
    });
  }

  async updateProfil(id: number, dto: UpdateProfilDto) {
    const profil = await this.prisma.profil.findFirst({
      where: { id, is_deleted: false },
    });
    if (!profil) throw new NotFoundException('Profil introuvable');

    return this.prisma.profil.update({
      where: { id },
      data: { ...dto, updated_at: new Date() },
    });
  }

  async softDeleteProfil(id: number) {
    const profil = await this.prisma.profil.findFirst({
      where: { id, is_deleted: false },
    });
    if (!profil) throw new NotFoundException('Profil introuvable');

    return this.prisma.profil.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }

  // ─── Features ─────────────────────────────────────────────

  async findAllFeatures() {
    return this.prisma.feature.findMany({
      where: { is_deleted: false },
      orderBy: [{ parent_id: 'asc' }, { id: 'asc' }],
    });
  }

  async createFeature(dto: CreateFeatureDto) {
    return this.prisma.feature.create({
      data: {
        code: dto.code,
        libelle: dto.libelle,
        description: dto.description ?? null,
        parent_id: dto.parent_id ?? null,
        created_at: new Date(),
      },
    });
  }

  // ─── Assignations ─────────────────────────────────────────

  async findAllAssignments() {
    return this.prisma.feature_profil.findMany({
      where: { is_deleted: false },
      include: {
        profil: { select: { id: true, libelle: true, code: true } },
        feature: { select: { id: true, code: true, libelle: true } },
      },
    });
  }

  async assignFeature(profilId: number, featureId: number) {
    const profil = await this.prisma.profil.findFirst({
      where: { id: profilId, is_deleted: false },
    });
    if (!profil) throw new NotFoundException('Profil introuvable');

    const feature = await this.prisma.feature.findFirst({
      where: { id: featureId, is_deleted: false },
    });
    if (!feature) throw new NotFoundException('Feature introuvable');

    const existing = await this.prisma.feature_profil.findFirst({
      where: { profil_id: profilId, feature_id: featureId, is_deleted: false },
    });
    if (existing) {
      throw new BadRequestException('Cette feature est déjà assignée à ce profil');
    }

    return this.prisma.feature_profil.create({
      data: {
        profil_id: profilId,
        feature_id: featureId,
        created_at: new Date(),
      },
    });
  }

  async removeAssignment(profilId: number, featureId: number) {
    const existing = await this.prisma.feature_profil.findFirst({
      where: { profil_id: profilId, feature_id: featureId, is_deleted: false },
    });
    if (!existing) throw new NotFoundException('Assignation introuvable');

    return this.prisma.feature_profil.update({
      where: { id: existing.id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
      },
    });
  }
}
