import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { ProgrammeService } from './programme.service';
import { CreateEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { EvenementResponseDto } from './dto/evenement-response.dto';
import { CreateMasterclassDto } from './dto/create-masterclass.dto';
import { MasterclassResponseDto } from './dto/masterclass-response.dto';
import { CreateInscriptionDto } from './dto/create-inscription.dto';

@ApiTags('Programme')
@Controller('programme')
export class ProgrammeController {
  constructor(private readonly programmeService: ProgrammeService) {}

  // ─── Événements ───────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Lister les événements',
    description: 'Retourne les événements filtrés par édition, jour et type.',
  })
  @ApiQuery({ name: 'edition_id', required: false, type: Number })
  @ApiQuery({ name: 'jour', required: false, type: String, example: '2025-07-18' })
  @ApiQuery({ name: 'type_evenement_id', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des événements' })
  findAll(
    @Query('edition_id') edition_id?: string,
    @Query('jour') jour?: string,
    @Query('type_evenement_id') type_evenement_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.programmeService.findAll({
      edition_id: edition_id ? parseInt(edition_id, 10) : undefined,
      jour,
      type_evenement_id: type_evenement_id
        ? parseInt(type_evenement_id, 10)
        : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getByCriteria(@Query() query: Record<string, string>) {
    return this.programmeService.getByCriteria(query);
  }

  @Get('favoris')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mes favoris',
    description: "Retourne les événements mis en favoris par l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Liste des favoris' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getFavoris(@Request() req: AuthenticatedRequest) {
    return this.programmeService.getFavoris(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail d'un événement",
    description: "Retourne un événement avec sa masterclass si applicable.",
  })
  @ApiResponse({
    status: 200,
    description: "Détail de l'événement",
    type: EvenementResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Événement introuvable',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req?: AuthenticatedRequest) {
    const userId = req?.user?.sub;
    return this.programmeService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_PROGRAMME')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer un événement',
    description: "Réservé aux administrateurs ayant la feature GERER_PROGRAMME.",
  })
  @ApiResponse({
    status: 201,
    description: 'Événement créé',
    type: EvenementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  create(@Body() dto: CreateEvenementDto) {
    return this.programmeService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_PROGRAMME')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Modifier un événement',
    description: 'Réservé aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Événement modifié',
    type: EvenementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvenementDto,
  ) {
    return this.programmeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_PROGRAMME')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer un événement',
    description: 'Soft-delete. Réservé aux administrateurs.',
  })
  @ApiResponse({ status: 200, description: 'Événement supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.programmeService.remove(id);
  }

  // ─── Masterclass ──────────────────────────────────────────────

  @Post('masterclass')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_PROGRAMME')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une masterclass',
    description: "Réservé aux administrateurs ayant la feature GERER_PROGRAMME.",
  })
  @ApiResponse({
    status: 201,
    description: 'Masterclass créée',
    type: MasterclassResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 409, description: 'Masterclass déjà existante pour cet événement' })
  createMasterclass(@Body() dto: CreateMasterclassDto) {
    return this.programmeService.createMasterclass(dto);
  }

  @Patch('masterclass/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_PROGRAMME')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Modifier une masterclass',
    description: 'Réservé aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Masterclass modifiée',
    type: MasterclassResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Masterclass introuvable' })
  updateMasterclass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateMasterclassDto>,
  ) {
    return this.programmeService.updateMasterclass(id, dto);
  }

  // ─── Inscriptions ─────────────────────────────────────────────

  @Post('masterclass/:id/inscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "S'inscrire à une masterclass",
    description: "L'utilisateur connecté s'inscrit comme expert, modérateur ou participant.",
  })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Masterclass introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà inscrit ou masterclass complète' })
  inscribe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateInscriptionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.programmeService.inscribe(req.user.sub, id, dto);
  }

  @Get('masterclass/:id/inscriptions')
  @ApiOperation({
    summary: 'Lister les inscrits',
    description: "Retourne la liste des participants à une masterclass par rôle.",
  })
  @ApiResponse({ status: 200, description: 'Liste des inscriptions' })
  @ApiResponse({ status: 404, description: 'Masterclass introuvable' })
  findInscriptions(@Param('id', ParseIntPipe) id: number) {
    return this.programmeService.findInscriptions(id);
  }

  @Delete('masterclass/:id/inscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Se désinscrire d'une masterclass",
    description: "L'utilisateur connecté se désinscrit.",
  })
  @ApiResponse({ status: 200, description: 'Désinscription réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Inscription introuvable' })
  unsubscribe(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.programmeService.unsubscribe(req.user.sub, id);
  }

  // ─── Favoris ──────────────────────────────────────────────────

  @Post(':id/favori')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ajouter/retirer des favoris',
    description: "Toggle : ajoute ou retire l'événement des favoris.",
  })
  @ApiResponse({ status: 200, description: 'Favori togglé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Événement introuvable' })
  toggleFavori(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.programmeService.toggleFavori(req.user.sub, id);
  }
}
