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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { AwardsService } from './awards.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { CandidatureResponseDto } from './dto/candidature-response.dto';
import { JuryVoteDto } from './dto/jury-vote.dto';
import { PublicVoteDto } from './dto/public-vote.dto';

@ApiTags('Awards')
@Controller('awards')
export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Lister les catégories' })
  @ApiQuery({ name: 'edition_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des catégories', type: [CategoryResponseDto] })
  async findCategories(@Query('edition_id') edition_id?: string) {
    return this.awardsService.findAllCategories(
      edition_id ? parseInt(edition_id) : undefined,
    );
  }

  @Get('categories/get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getCategoriesByCriteria(@Query() query: Record<string, string>) {
    return this.awardsService.getCategoriesByCriteria(query);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_AWARDS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une catégorie (admin)' })
  @ApiResponse({ status: 201, description: 'Catégorie créée', type: CategoryResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.awardsService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_AWARDS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une catégorie (admin)' })
  @ApiResponse({ status: 200, description: 'Catégorie modifiée', type: CategoryResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.awardsService.updateCategory(id, dto);
  }

  @Post('candidatures')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre une candidature' })
  @ApiResponse({ status: 201, description: 'Candidature créée', type: CandidatureResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà candidaté dans cette catégorie' })
  async submitCandidature(@Req() req: AuthenticatedRequest, @Body() dto: CreateCandidatureDto) {
    return this.awardsService.submitCandidature(req.user.sub, dto);
  }

  @Get('candidatures')
  @ApiOperation({ summary: 'Lister les candidatures' })
  @ApiQuery({ name: 'edition_id', required: false, type: Number })
  @ApiQuery({ name: 'categorie_id', required: false, type: Number })
  @ApiQuery({ name: 'statut_id', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste paginée des candidatures' })
  async findCandidatures(
    @Query('edition_id') edition_id?: string,
    @Query('categorie_id') categorie_id?: string,
    @Query('statut_id') statut_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.awardsService.findAllCandidatures({
      edition_id: edition_id ? parseInt(edition_id) : undefined,
      categorie_id: categorie_id ? parseInt(categorie_id) : undefined,
      statut_id: statut_id ? parseInt(statut_id) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('candidatures/get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getCandidaturesByCriteria(@Query() query: Record<string, string>) {
    return this.awardsService.getCandidaturesByCriteria(query);
  }

  @Get('candidatures/:id')
  @ApiOperation({ summary: 'Détail candidature' })
  @ApiResponse({ status: 200, description: 'Candidature', type: CandidatureResponseDto })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  async findOneCandidature(@Param('id', ParseIntPipe) id: number) {
    return this.awardsService.findOneCandidature(id);
  }

  @Patch('candidatures/:id/statut')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_AWARDS')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Changer le statut d'une candidature (admin)" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { statut_id: { type: 'number', example: 2 } },
      required: ['statut_id'],
    },
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour', type: CandidatureResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  async updateCandidatureStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body('statut_id', ParseIntPipe) statut_id: number,
  ) {
    return this.awardsService.updateCandidatureStatut(id, statut_id);
  }

  @Post('candidatures/:id/medias')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader un média pour une candidature (propriétaire)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        media_type_id: { type: 'number', example: 1 },
      },
      required: ['file', 'media_type_id'],
    },
  })
  @ApiResponse({ status: 201, description: 'Média uploadé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non propriétaire' })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  async uploadMedia(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('media_type_id', ParseIntPipe) media_type_id: number,
  ) {
    return this.awardsService.uploadMedia(id, req.user.sub, file, media_type_id);
  }

  @Post('votes/jury')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voter en tant que jury' })
  @ApiResponse({ status: 201, description: 'Vote enregistré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà voté pour cette candidature' })
  async submitJuryVote(@Req() req: AuthenticatedRequest, @Body() dto: JuryVoteDto) {
    return this.awardsService.submitJuryVote(req.user.sub, dto);
  }

  @Post('votes/public')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voter pour le public' })
  @ApiResponse({ status: 201, description: 'Vote public enregistré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Candidature introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà voté dans cette catégorie' })
  async submitPublicVote(@Req() req: AuthenticatedRequest, @Body() dto: PublicVoteDto) {
    return this.awardsService.submitPublicVote(req.user.sub, dto);
  }

  @Get('votes/results/:categorieId')
  @ApiOperation({ summary: 'Résultats du jury pour une catégorie' })
  @ApiResponse({ status: 200, description: 'Résultats' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  async getJuryResults(@Param('categorieId', ParseIntPipe) categorieId: number) {
    return this.awardsService.getJuryResults(categorieId);
  }
}
