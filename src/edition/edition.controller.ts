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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { EditionService } from './edition.service';
import { CreateEditionDto } from './dto/create-edition.dto';
import { UpdateEditionDto } from './dto/update-edition.dto';
import { EditionResponseDto } from './dto/edition-response.dto';

@ApiTags('Edition')
@Controller('editions')
export class EditionController {
  constructor(private readonly editionService: EditionService) {}

  @Get()
  @ApiOperation({ summary: 'Lister toutes les éditions' })
  @ApiResponse({
    status: 200,
    description: 'Liste des éditions',
    type: [EditionResponseDto],
  })
  findAll() {
    return this.editionService.findAll();
  }

  @Get('get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getByCriteria(@Query() query: Record<string, string>) {
    return this.editionService.getByCriteria(query);
  }

  @Get('current')
  @ApiOperation({ summary: "Édition en cours (statut_id=3) ou la plus récente" })
  @ApiResponse({
    status: 200,
    description: 'Édition courante',
    type: EditionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Aucune édition trouvée' })
  findCurrent() {
    return this.editionService.findCurrent();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une édition" })
  @ApiResponse({
    status: 200,
    description: 'Détail de l\'édition',
    type: EditionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Édition introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.editionService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_EDITION')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle édition' })
  @ApiResponse({
    status: 201,
    description: 'Édition créée',
    type: EditionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  create(@Body() dto: CreateEditionDto, @Request() req: AuthenticatedRequest) {
    return this.editionService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_EDITION')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une édition' })
  @ApiResponse({
    status: 200,
    description: 'Édition modifiée',
    type: EditionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Édition introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEditionDto,
  ) {
    return this.editionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_EDITION')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une édition (soft-delete)' })
  @ApiResponse({
    status: 200,
    description: 'Édition supprimée',
    type: EditionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Édition introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.editionService.remove(id);
  }
}
