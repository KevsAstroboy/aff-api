import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLieuDto } from './dto/create-lieu.dto';
import { UpdateLieuDto } from './dto/update-lieu.dto';

@Injectable()
export class LieuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lieu.findMany({
      where: { is_deleted: false },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const lieu = await this.prisma.lieu.findFirst({
      where: { id, is_deleted: false },
    });
    if (!lieu) throw new NotFoundException('Lieu introuvable');
    return lieu;
  }

  async create(dto: CreateLieuDto) {
    const max = await this.prisma.lieu.findFirst({
      where: {},
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const newId = (max?.id ?? 0) + 1;

    return this.prisma.lieu.create({
      data: {
        id: newId,
        libelle: dto.libelle,
        capacite: dto.capacite,
      },
    });
  }

  async update(id: number, dto: UpdateLieuDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.libelle !== undefined) data.libelle = dto.libelle;
    if (dto.capacite !== undefined) data.capacite = dto.capacite;

    return this.prisma.lieu.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.lieu.update({
      where: { id },
      data: { is_deleted: true },
    });
  }
}