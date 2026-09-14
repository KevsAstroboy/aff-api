import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { RequireFeature } from './guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Inscription utilisateur',
    description: 'Crée un compte inactif et envoie un code OTP par email.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'OTP envoyé',
    schema: { example: { message: 'Un code de vérification a été envoyé à user@example.com' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: { example: { message: ['email must be an email'], error: 'Bad Request', statusCode: 400 } },
  })
  @ApiResponse({
    status: 409,
    description: 'Username ou email déjà utilisé',
    schema: { example: { message: "Ce nom d'utilisateur est déjà pris", error: 'Conflict', statusCode: 409 } },
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code OTP',
    description: 'Vérifie le code reçu par email et active le compte.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'Compte activé', type: AuthResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Code invalide, expiré, ou compte déjà activé',
    schema: { example: { message: 'Code invalide', error: 'Bad Request', statusCode: 400 } },
  })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renvoyer le code OTP',
    description: 'Invalide l ancien code et en envoie un nouveau.',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'Nouveau code envoyé' })
  @ApiResponse({
    status: 400,
    description: 'Aucun compte inactif ou délai non respecté',
    schema: { example: { message: 'Aucun compte inactif trouvé avec cet email', error: 'Bad Request', statusCode: 400 } },
  })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description: 'Authentifie avec username/email et mot de passe. Si is_default_password=true, le front doit rediriger vers /change-password.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie', type: AuthResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: { example: { message: ['identifier must be longer than or equal to 3 characters'], error: 'Bad Request', statusCode: 400 } },
  })
  @ApiResponse({
    status: 401,
    description: 'Identifiants invalides ou compte non activé',
    schema: { example: { message: 'Compte non activé. Vérifiez votre email pour le code OTP.', error: 'Unauthorized', statusCode: 401 } },
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description: "Envoie un code OTP par email pour réinitialiser le mot de passe. Ne révèle pas si l'email existe.",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Code envoyé (si email existe)', schema: { example: { message: 'Si cet email est associé à un compte, un code de réinitialisation a été envoyé.' } } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: 'Vérifie le code OTP et change le mot de passe.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé', schema: { example: { message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' } } })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré', schema: { example: { message: 'Code invalide', error: 'Bad Request', statusCode: 400 } } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Changer le mot de passe',
    description: 'Change le mot de passe de l utilisateur connecté. Passe is_default_password à false.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié', schema: { example: { message: 'Mot de passe modifié avec succès' } } })
  @ApiResponse({ status: 400, description: 'Ancien mot de passe incorrect' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Modifier son profil',
    description: "Met à jour les informations du profil de l'utilisateur connecté.",
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Numéro de téléphone déjà utilisé' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  @Post('profile/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Photo de profil',
    description: "Upload une photo de profil en base64 (max 5 Mo). Remplace l'ancienne.",
  })
  @ApiBody({ type: UploadPhotoDto })
  @ApiResponse({
    status: 200,
    description: 'Photo uploadée',
    schema: { example: { profile_picture_path: 'http://minio:9000/aff-uploads/profiles/3/avatar.jpg' } },
  })
  @ApiResponse({ status: 400, description: 'Format invalide ou taille dépassée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.authService.uploadProfilePhoto(req.user.sub, dto.image);
  }

  @Get('profile/portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Portfolio utilisateur connecté' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Publications du portfolio' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getPortfolio(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getPortfolio(
      req.user.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('profile/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques du profil connecté' })
  @ApiResponse({ status: 200, description: 'Stats utilisateur' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfileStats(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfileStats(req.user.sub);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler le access_token' })
  @ApiBody({ schema: { example: { refresh_token: 'eyJhbG...' } } })
  @ApiResponse({ status: 200, description: 'Nouveau token', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}

@ApiTags('Admin')
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer un compte utilisateur (admin)',
    description: 'Crée un compte avec profils sélectionnés et mot de passe temporaire.',
  })
  @ApiBody({ type: CreateUserAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Compte créé',
    schema: {
      example: {
        user: { id: 5, username: 'john_doe', email: 'john@example.com' },
        temp_password: 'aB3xK9mP2wQ7',
        message: 'Compte créé. Transmettez le mot de passe temporaire à l utilisateur.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 409, description: 'Username ou email déjà utilisé' })
  async createUser(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateUserAdminDto,
  ) {
    return this.authService.createUserByAdmin(dto, req.user.sub);
  }
}
