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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { CommunauteService } from './communaute.service';
import { CreateCommunauteDto } from './dto/create-communaute.dto';
import { UpdateCommunauteDto } from './dto/update-communaute.dto';
import { CommunauteResponseDto } from './dto/communaute-response.dto';

@ApiTags('Communaute')
@Controller('communaute')
export class CommunauteController {
  constructor(private readonly communauteService: CommunauteService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les communautés',
    description: 'Retourne toutes les communautés actives (non supprimées).',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des communautés',
    type: [CommunauteResponseDto],
  })
  findAll() {
    return this.communauteService.findAll();
  }

  @Get('get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getByCriteria(@Query() query: Record<string, string>) {
    return this.communauteService.getByCriteria(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détail communauté',
    description: "Retourne une communauté par son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Détail de la communaute',
    type: CommunauteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Communaute introuvable',
    schema: {
      example: {
        message: 'Communaute introuvable',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.communauteService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_COMMUNAUTE')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une communauté',
    description: 'Réservé aux administrateurs ayant la feature GERER_COMMUNAUTE.',
  })
  @ApiResponse({
    status: 201,
    description: 'Communaute créée',
    type: CommunauteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: {
      example: {
        message: ['libelle must be shorter than or equal to 255 characters'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Permission refusée',
    schema: {
      example: {
        message: 'Permission refusée : GERER_COMMUNAUTE',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  create(@Body() dto: CreateCommunauteDto, @Request() req: AuthenticatedRequest) {
    return this.communauteService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_COMMUNAUTE')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Modifier une communauté',
    description: 'Réservé aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Communaute modifiée',
    type: CommunauteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: {
      example: {
        message: ['libelle must be shorter than or equal to 255 characters'],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Permission refusée',
    schema: {
      example: {
        message: 'Permission refusée : GERER_COMMUNAUTE',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Communaute introuvable',
    schema: {
      example: {
        message: 'Communaute introuvable',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommunauteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.communauteService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_COMMUNAUTE')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Supprimer une communauté',
    description: 'Soft-delete. Réservé aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Communaute supprimée',
    type: CommunauteResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Permission refusée',
    schema: {
      example: {
        message: 'Permission refusée : GERER_COMMUNAUTE',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Communaute introuvable',
    schema: {
      example: {
        message: 'Communaute introuvable',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.communauteService.remove(id, req.user.sub);
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "S'abonner à une communauté",
    description: "L'utilisateur connecté s'abonne à la communauté cible.",
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement réussi',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Communaute introuvable',
    schema: {
      example: {
        message: 'Communaute introuvable',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Déjà abonné',
    schema: {
      example: {
        message: 'Déjà abonné à cette communaute',
        error: 'Conflict',
        statusCode: 409,
      },
    },
  })
  subscribe(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.communauteService.subscribe(req.user.sub, id);
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Se désabonner d'une communauté",
    description: "L'utilisateur connecté se désabonne de la communauté cible.",
  })
  @ApiResponse({
    status: 200,
    description: 'Désabonnement réussi',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: { message: 'Unauthorized', statusCode: 401 },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Communaute ou abonnement introuvable',
    schema: {
      example: {
        message: 'Abonnement introuvable',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  unsubscribe(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.communauteService.unsubscribe(req.user.sub, id);
  }
}
