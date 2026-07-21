import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 7 * 24 * 60 * 60;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_DELAY_SECONDS = 60;

interface SessionCache {
  userId: number;
  features: string[];
  profils: { id: number; libelle: string; code: string }[];
  profilsVersions: Record<number, number>;
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email },
          { phone_numb: dto.phone_numb },
        ],
        is_deleted: false,
      },
    });

    if (existing) {
      if (existing.username === dto.username) {
        throw new ConflictException("Ce nom d'utilisateur est déjà pris");
      }
      if (existing.email === dto.email) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      if (existing.phone_numb === dto.phone_numb) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          nom: dto.nom,
          prenom: dto.prenom,
          description: dto.description,
          phone_numb: dto.phone_numb,
          is_officiel: false,
          is_active: false,
          is_default_password: false,
          created_at: new Date(),
        },
      });

      if (dto.communaute_id) {
        const communaute = await tx.communaute.findFirst({
          where: { id: dto.communaute_id, is_deleted: false },
        });
        if (communaute) {
          const newUser = await tx.user.findFirst({
            where: { username: dto.username },
          });
          if (newUser) {
            await tx.user_communaute.create({
              data: {
                user_id: newUser.id,
                communaute_id: dto.communaute_id,
                joined_at: new Date(),
              },
            });
          }
        }
      }
    });

    await this.sendOtpForEmail(dto.email);

    return {
      message: `Un code de vérification a été envoyé à ${dto.email}`,
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, is_deleted: false },
    });

    if (!user) {
      throw new BadRequestException('Code invalide');
    }

    if (user.is_active) {
      throw new BadRequestException('Compte déjà activé');
    }

    const otp = await this.prisma.otp.findFirst({
      where: { email: dto.email, is_verified: false },
      orderBy: { created_at: 'desc' },
    });

    if (!otp || otp.code !== dto.otp_code) {
      if (otp) {
        const attempts = (otp.attempts ?? 0) + 1;
        if (attempts >= 5) {
          await this.prisma.otp.update({
            where: { id: otp.id },
            data: { is_verified: true },
          });
          throw new BadRequestException(
            'Trop de tentatives. Demandez un nouveau code.',
          );
        }
        await this.prisma.otp.update({
          where: { id: otp.id },
          data: { attempts },
        });
      }
      throw new BadRequestException('Code invalide');
    }

    if (new Date() > otp.expires_at) {
      throw new BadRequestException(
        'Code expiré. Demandez un nouveau code.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.otp.update({
        where: { id: otp.id },
        data: { is_verified: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { is_active: true },
      }),
      this.prisma.user_profil.create({
        data: {
          user_id: user.id,
          profil_id: 1,
          created_at: new Date(),
        },
      }),
    ]);

    return this.buildAuthResponse(user.id);
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, is_deleted: false },
    });

    if (!user) {
      throw new BadRequestException(
        'Aucun compte inactif trouvé avec cet email',
      );
    }

    if (user.is_active) {
      throw new BadRequestException('Ce compte est déjà activé');
    }

    const lastOtp = await this.prisma.otp.findFirst({
      where: { email: dto.email },
      orderBy: { created_at: 'desc' },
    });

    if (lastOtp) {
      const secondsSinceLast = Math.floor(
        (Date.now() - new Date(lastOtp.created_at!).getTime()) / 1000,
      );
      if (secondsSinceLast < OTP_RESEND_DELAY_SECONDS) {
        throw new BadRequestException(
          'Veuillez patienter avant de redemander un code',
        );
      }
    }

    await this.prisma.otp.updateMany({
      where: { email: dto.email, is_verified: false },
      data: { is_verified: true },
    });

    await this.sendOtpForEmail(dto.email);

    return { message: `Un nouveau code a été envoyé à ${dto.email}` };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.identifier }, { email: dto.identifier }],
        is_deleted: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        'Compte non activé. Vérifiez votre email pour le code OTP.',
      );
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password ?? '',
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.buildAuthResponse(user.id);
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_deleted: false },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const valid = await bcrypt.compare(dto.old_password, user.password ?? '');
    if (!valid) {
      throw new BadRequestException('Ancien mot de passe incorrect');
    }

    const hashed = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        is_default_password: false,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Password changed for user ${userId}`);

    return { message: 'Mot de passe modifié avec succès' };
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_deleted: false },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (dto.phone_numb && dto.phone_numb !== user.phone_numb) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone_numb: dto.phone_numb,
          id: { not: userId },
          is_deleted: false,
        },
      });
      if (existingPhone) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.prenom !== undefined && { prenom: dto.prenom }),
        ...(dto.phone_numb !== undefined && { phone_numb: dto.phone_numb }),
        ...(dto.description !== undefined && { description: dto.description }),
        updated_at: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        nom: true,
        prenom: true,
        phone_numb: true,
        description: true,
        profile_picture_path: true,
        is_officiel: true,
        is_active: true,
        is_default_password: true,
        created_at: true,
        updated_at: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);

    return updated;
  }

  async uploadProfilePhoto(userId: number, base64Image: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_deleted: false },
      select: { profile_picture_path: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    if (user.profile_picture_path) {
      try {
        const oldPath = user.profile_picture_path;
        const match = oldPath.match(/\/([^/]+)\/([^/]+)$/);
        if (match) {
          await this.storageService.deleteFile(match[1], match[2]);
        }
      } catch {
        this.logger.warn(`Failed to delete old profile photo for user ${userId}`);
      }
    }

    const ext = this.extractExtension(base64Image);
    const objectName = `profiles/${userId}/avatar.${ext}`;
    const filePath = await this.storageService.uploadBase64(
      base64Image,
      'aff-uploads',
      objectName,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile_picture_path: filePath,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Profile photo updated for user ${userId}`);

    return { profile_picture_path: filePath };
  }

  private extractExtension(base64: string): string {
    const match = base64.match(/^data:image\/([A-Za-z-+]+);base64,/);
    if (!match) return 'jpg';
    const type = match[1].toLowerCase();
    if (type === 'jpeg') return 'jpg';
    if (type === 'svg+xml') return 'svg';
    return type;
  }

  async createUserByAdmin(dto: CreateUserAdminDto, createdById: number) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
        is_deleted: false,
      },
    });

    if (existing) {
      if (existing.username === dto.username) {
        throw new ConflictException("Ce nom d'utilisateur est déjà pris");
      }
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          nom: dto.nom,
          prenom: dto.prenom,
          is_officiel: dto.is_officiel ?? false,
          is_active: true,
          is_default_password: true,
          created_at: new Date(),
          created_by: createdById,
        },
      });

      for (const profilId of dto.profil_ids) {
        await tx.user_profil.create({
          data: {
            user_id: newUser.id,
            profil_id: profilId,
            created_at: new Date(),
          },
        });
      }

      return newUser;
    });

    this.logger.log(
      `Admin user ${createdById} created user ${user.id} (${user.username})`,
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        is_officiel: user.is_officiel,
        is_active: user.is_active,
      },
      temp_password: tempPassword,
      message:
        'Compte créé. Transmettez le mot de passe temporaire à l utilisateur.',
    };
  }

  async getSession(userId: number): Promise<SessionCache | null> {
    const raw = await this.redis.get(`${SESSION_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async refreshSession(userId: number): Promise<SessionCache> {
    const session = await this.computeSession(userId);
    await this.redis.set(
      `${SESSION_PREFIX}${userId}`,
      JSON.stringify(session),
      'EX',
      SESSION_TTL,
    );
    return session;
  }

  private async sendOtpForEmail(email: string): Promise<void> {
    const code = generateOtpCode();
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.otp.create({
      data: {
        email,
        code,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    });

    this.mailService.sendOtpEmail(email, code).catch((error) => {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${error instanceof Error ? error.message : error}`,
      );
      this.logger.log(`OTP code for ${email}: ${code} (fallback — email failed)`);
    });
  }

  private async buildAuthResponse(userId: number): Promise<AuthResponseDto> {
    const session = await this.refreshSession(userId);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        nom: true,
        prenom: true,
        description: true,
        profile_picture_path: true,
        is_officiel: true,
        is_active: true,
        is_default_password: true,
      },
    });

    const payload = { sub: userId, username: user.username ?? '' };
    const access_token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        username: user.username ?? '',
        email: user.email ?? '',
        nom: user.nom ?? undefined,
        prenom: user.prenom ?? undefined,
        description: user.description ?? undefined,
        profile_picture_path: user.profile_picture_path ?? undefined,
        is_officiel: user.is_officiel ?? false,
        is_active: user.is_active ?? true,
        is_default_password: user.is_default_password ?? false,
      },
      profils: session.profils,
      features: session.features,
      access_token,
      token_type: 'Bearer',
    };
  }

  private async computeSession(userId: number): Promise<SessionCache> {
    const userProfils = await this.prisma.user_profil.findMany({
      where: { user_id: userId, is_deleted: false },
      select: {
        profil: { select: { id: true, libelle: true, code: true } },
      },
    });

    const profils = userProfils
      .map((up) => up.profil)
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        id: p.id,
        libelle: p.libelle ?? '',
        code: p.code ?? '',
      }));

    const profilIds = profils.map((p) => p.id);

    if (profilIds.length === 0) {
      return { userId, features: [], profils: [], profilsVersions: {} };
    }

    type FeatureRow = { code: string };
    const features: FeatureRow[] = await this.prisma.$queryRawUnsafe(
      `WITH RECURSIVE feature_tree AS (
        SELECT DISTINCT f.id, f.code, f.parent_id
        FROM feature_profil fp
        JOIN feature f ON f.id = fp.feature_id
        WHERE fp.profil_id = ANY($1::int[])
          AND fp.is_deleted = false
          AND f.is_deleted = false

        UNION

        SELECT f.id, f.code, f.parent_id
        FROM feature f
        INNER JOIN feature_tree ft ON f.id = ft.parent_id
        WHERE f.is_deleted = false
      )
      SELECT DISTINCT code FROM feature_tree`,
      profilIds,
    );

    const versions = await this.prisma.profil.findMany({
      where: { id: { in: profilIds }, is_deleted: false },
      select: { id: true, features_version: true },
    });

    const profilsVersions: Record<number, number> = {};
    for (const v of versions) {
      profilsVersions[v.id] = v.features_version ?? 1;
    }

    return {
      userId,
      features: features.map((f) => f.code),
      profils,
      profilsVersions,
    };
  }
}
