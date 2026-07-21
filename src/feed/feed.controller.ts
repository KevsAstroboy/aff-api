import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { FeedService } from './feed.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { PublicationResponseDto } from './dto/publication-response.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { CommentaireResponseDto } from './dto/commentaire-response.dto';
import { HashtagResponseDto } from './dto/hashtag-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';

@ApiTags('Feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Flux de publications paginé' })
  @ApiQuery({ name: 'communaute_id', required: false, type: Number })
  @ApiQuery({ name: 'hashtag_id', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des publications', type: [PublicationResponseDto] })
  async findAll(
    @Query('communaute_id') communaute_id?: string,
    @Query('hashtag_id') hashtag_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedService.findAll({
      communaute_id: communaute_id ? parseInt(communaute_id) : undefined,
      hashtag_id: hashtag_id ? parseInt(hashtag_id) : undefined,
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
    return this.feedService.getByCriteria(query);
  }

  @Get('hashtags')
  @ApiOperation({ summary: 'Liste des hashtags' })
  @ApiResponse({ status: 200, description: 'Liste des hashtags', type: [HashtagResponseDto] })
  async findAllHashtags() {
    return this.feedService.findAllHashtags();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail publication avec commentaires' })
  @ApiResponse({ status: 200, description: 'Publication', type: PublicationResponseDto })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.findOne(id);
  }

  @Post('publications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une publication' })
  @ApiResponse({ status: 201, description: 'Publication créée', type: PublicationResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides ou trigger violation' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePublicationDto) {
    return this.feedService.create(req.user.sub, dto);
  }

  @Patch('publications/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier publication (propriétaire)' })
  @ApiResponse({ status: 200, description: 'Publication mise à jour', type: PublicationResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non propriétaire' })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePublicationDto,
  ) {
    return this.feedService.update(id, req.user.sub, dto);
  }

  @Delete('publications/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer publication (propriétaire/admin)' })
  @ApiResponse({ status: 200, description: 'Publication supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.feedService.remove(id, req.user.sub);
  }

  @Post('publications/:id/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle réaction (ajouter/changer/retirer)' })
  @ApiResponse({ status: 200, description: 'État de la réaction' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async toggleReaction(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReactionDto,
  ) {
    return this.feedService.toggleReaction(req.user.sub, id, dto.reaction_type_id);
  }

  @Get('publications/:id/reactions')
  @ApiOperation({ summary: 'Réactions groupées par type' })
  @ApiResponse({ status: 200, description: 'Réactions' })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async getReactions(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.getReactions(id);
  }

  @Post('publications/:id/commentaires')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter commentaire' })
  @ApiResponse({ status: 201, description: 'Commentaire créé', type: CommentaireResponseDto })
  @ApiResponse({ status: 400, description: 'Violation profondeur (2 niveaux max)' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async createCommentaire(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentaireDto,
  ) {
    return this.feedService.createCommentaire(req.user.sub, { ...dto, publication_id: id });
  }

  @Get('publications/:id/commentaires')
  @ApiOperation({ summary: 'Commentaires (imbriqués, 2 niveaux)' })
  @ApiResponse({ status: 200, description: 'Liste commentaires', type: [CommentaireResponseDto] })
  @ApiResponse({ status: 404, description: 'Publication introuvable' })
  async findCommentaires(@Param('id', ParseIntPipe) id: number) {
    return this.feedService.findCommentairesByPublication(id);
  }

  @Delete('commentaires/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer commentaire (propriétaire/admin)' })
  @ApiResponse({ status: 200, description: 'Commentaire supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé' })
  @ApiResponse({ status: 404, description: 'Commentaire introuvable' })
  async removeCommentaire(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.feedService.removeCommentaire(id, req.user.sub);
  }
}
