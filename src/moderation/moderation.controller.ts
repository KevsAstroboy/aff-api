import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';
import { SignalementResponseDto } from './dto/signalement-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signaler un contenu ou utilisateur' })
  @ApiResponse({ status: 201, description: 'Signalement créé', type: SignalementResponseDto })
  @ApiResponse({ status: 400, description: 'Cible introuvable' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSignalementDto) {
    return this.moderationService.create(req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_SIGNALEMENTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les signalements (admin)' })
  @ApiQuery({ name: 'statut_id', required: false, type: Number })
  @ApiQuery({ name: 'cible_type_id', required: false, type: Number })
  @ApiQuery({ name: 'severite_id', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des signalements', type: [SignalementResponseDto] })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async findAll(
    @Query('statut_id') statut_id?: string,
    @Query('cible_type_id') cible_type_id?: string,
    @Query('severite_id') severite_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.findAll({
      statut_id: statut_id ? parseInt(statut_id) : undefined,
      cible_type_id: cible_type_id ? parseInt(cible_type_id) : undefined,
      severite_id: severite_id ? parseInt(severite_id) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getByCriteria(@Query() query: Record<string, string>) {
    return this.moderationService.getByCriteria(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_SIGNALEMENTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail signalement (admin)' })
  @ApiResponse({ status: 200, description: 'Signalement', type: SignalementResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Signalement introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moderationService.findOne(id);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_SIGNALEMENTS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Résoudre/clore un signalement (admin)' })
  @ApiResponse({ status: 200, description: 'Signalement résolu', type: SignalementResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Signalement introuvable' })
  async resolve(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSignalementDto,
  ) {
    return this.moderationService.resolve(id, req.user.sub, dto);
  }
}
