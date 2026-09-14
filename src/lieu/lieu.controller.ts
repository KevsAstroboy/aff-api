import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { LieuService } from './lieu.service';
import { CreateLieuDto } from './dto/create-lieu.dto';
import { UpdateLieuDto } from './dto/update-lieu.dto';

@ApiTags('Lieu')
@Controller('lieu')
export class LieuController {
  constructor(private readonly lieuService: LieuService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les lieux' })
  @ApiResponse({ status: 200, description: 'Liste des lieux' })
  findAll() {
    return this.lieuService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un lieu' })
  @ApiResponse({ status: 200, description: 'Détail du lieu' })
  @ApiResponse({ status: 404, description: 'Lieu introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lieuService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_LIEU')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un lieu' })
  @ApiResponse({ status: 201, description: 'Lieu créé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  create(@Body() dto: CreateLieuDto) {
    return this.lieuService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_LIEU')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un lieu' })
  @ApiResponse({ status: 200, description: 'Lieu modifié' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Lieu introuvable' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLieuDto) {
    return this.lieuService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('GERER_LIEU')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un lieu (soft-delete)' })
  @ApiResponse({ status: 200, description: 'Lieu supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Lieu introuvable' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lieuService.remove(id);
  }
}