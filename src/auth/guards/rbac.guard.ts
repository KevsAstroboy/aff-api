import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';
import { FEATURE_KEY } from './rbac.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentification requise');
    }

    let session = await this.authService.getSession(userId);

    if (!session) {
      session = await this.authService.refreshSession(userId);
    } else {
      const isStale = await this.isSessionStale(session);
      if (isStale) {
        session = await this.authService.refreshSession(userId);
      }
    }

    if (!session.features.includes(requiredFeature)) {
      throw new ForbiddenException(
        `Permission refusée : ${requiredFeature}`,
      );
    }

    return true;
  }

  private async isSessionStale(
    session: Awaited<ReturnType<typeof this.authService.getSession>>,
  ): Promise<boolean> {
    if (!session) return true;

    const profilIds = Object.keys(session.profilsVersions).map(Number);
    if (profilIds.length === 0) return false;

    const currentVersions = await this.prisma.profil.findMany({
      where: { id: { in: profilIds }, is_deleted: false },
      select: { id: true, features_version: true },
    });

    for (const cv of currentVersions) {
      const cachedVersion = session.profilsVersions[cv.id];
      if (!cachedVersion || cachedVersion !== (cv.features_version ?? 1)) {
        return true;
      }
    }

    return false;
  }
}
