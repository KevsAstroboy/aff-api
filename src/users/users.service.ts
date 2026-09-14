import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_deleted: false, is_active: true },
      select: {
        id: true,
        username: true,
        nom: true,
        prenom: true,
        description: true,
        profile_picture_path: true,
        is_officiel: true,
        is_default_password: true,
        created_at: true,
        user_communaute: {
          where: { is_deleted: false },
          include: {
            communaute: { select: { id: true, libelle: true, code: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const [publications, candidatures, inscriptions, portfolio] =
      await Promise.all([
        this.prisma.publication.count({
          where: { user_id: userId, is_deleted: false },
        }),
        this.prisma.candidature.count({
          where: { user_id: userId, is_deleted: false },
        }),
        this.prisma.masterclass_inscription.count({
          where: { user_id: userId, is_deleted: false },
        }),
        this.prisma.portfolio.count({
          where: { user_id: userId, is_deleted: false },
        }),
      ]);

    return {
      id: user.id,
      username: user.username,
      nom: user.nom,
      prenom: user.prenom,
      description: user.description,
      profile_picture_path: user.profile_picture_path,
      is_officiel: user.is_officiel,
      created_at: user.created_at,
      communautes: user.user_communaute.map((uc) => ({
        id: uc.communaute?.id,
        libelle: uc.communaute?.libelle,
        code: uc.communaute?.code,
      })),
      stats: {
        publications_count: publications,
        candidatures_count: candidatures,
        masterclass_inscriptions_count: inscriptions,
        portfolio_count: portfolio,
      },
    };
  }
}
