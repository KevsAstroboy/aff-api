import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(userId: number) {
    const items = await this.prisma.portfolio.findMany({
      where: { user_id: userId, is_deleted: false },
      orderBy: [{ ordre: 'asc' }, { created_at: 'desc' }],
    });

    return items.map((item) => ({
      id: item.id,
      titre: item.titre ?? '',
      description: item.description,
      categorie: item.categorie ?? '',
      annee: item.annee,
      file_path: item.file_path,
      created_at: item.created_at,
    }));
  }

  async create(userId: number, dto: CreatePortfolioItemDto) {
    const count = await this.prisma.portfolio.count({
      where: { user_id: userId, is_deleted: false },
    });

    const objectName = `portfolio/${userId}/${Date.now()}.jpg`;
    const filePath = await this.storage.uploadBase64(
      dto.image,
      'aff-uploads',
      objectName,
    );

    const item = await this.prisma.portfolio.create({
      data: {
        user_id: userId,
        titre: dto.titre ?? '',
        description: dto.description,
        categorie: dto.categorie ?? '',
        annee: dto.annee,
        file_path: filePath,
        ordre: count,
      },
    });

    return {
      id: item.id,
      titre: item.titre,
      description: item.description,
      categorie: item.categorie,
      annee: item.annee,
      file_path: item.file_path,
      created_at: item.created_at,
    };
  }

  async remove(itemId: number, userId: number) {
    const item = await this.prisma.portfolio.findFirst({
      where: { id: itemId, is_deleted: false },
    });

    if (!item) {
      throw new NotFoundException('Élément portfolio introuvable');
    }

    if (item.user_id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer cet élément',
      );
    }

    await this.prisma.portfolio.update({
      where: { id: itemId },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return { message: 'Élément portfolio supprimé' };
  }
}
