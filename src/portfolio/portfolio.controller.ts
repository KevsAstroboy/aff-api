import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';

@ApiTags('Portfolio')
@Controller('portfolio')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({
    summary: 'Portfolio de l\'utilisateur connecté',
    description: 'Retourne la galerie d\'images de l\'utilisateur connecté.',
  })
  @ApiResponse({ status: 200, description: 'Galerie portfolio' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.portfolioService.findAll(req.user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Ajouter une image au portfolio',
    description: 'Upload une image (base64, max 5 Mo) avec métadonnées.',
  })
  @ApiResponse({ status: 201, description: 'Élément créé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  create(
    @Body() dto: CreatePortfolioItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.portfolioService.create(req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un élément du portfolio' })
  @ApiResponse({ status: 200, description: 'Élément supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Élément introuvable' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.portfolioService.remove(id, req.user.sub);
  }
}
