import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface';
import { FeatureProfilService } from './feature-profil.service';
import { CreateProfilDto, UpdateProfilDto, ProfilResponseDto } from './dto/profil.dto';
import { CreateFeatureDto, FeatureResponseDto } from './dto/feature.dto';
import { AssignFeatureDto } from './dto/assign.dto';

@ApiTags('Feature-Profil')
@Controller('feature-profil')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeatureProfilController {
  constructor(private readonly service: FeatureProfilService) {}

  // ─── Profils ─────────────────────────────────────────────

  @Get('profils')
  @ApiOperation({ summary: 'Liste tous les profils' })
  @ApiResponse({ status: 200, type: [ProfilResponseDto] })
  findAllProfils() {
    return this.service.findAllProfils();
  }

  @Post('profils')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Créer un profil (admin)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: ProfilResponseDto })
  createProfil(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateProfilDto,
  ) {
    return this.service.createProfil(dto, req.user.sub);
  }

  @Patch('profils/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Modifier un profil (admin)' })
  @ApiBearerAuth()
  updateProfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfilDto,
  ) {
    return this.service.updateProfil(id, dto);
  }

  @Delete('profils/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Supprimer un profil (admin)' })
  @ApiBearerAuth()
  softDeleteProfil(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDeleteProfil(id);
  }

  // ─── Features ─────────────────────────────────────────────

  @Get('features')
  @ApiOperation({ summary: 'Liste toutes les features' })
  @ApiResponse({ status: 200, type: [FeatureResponseDto] })
  findAllFeatures() {
    return this.service.findAllFeatures();
  }

  @Post('features')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Créer une feature (admin)' })
  @ApiBearerAuth()
  createFeature(@Body() dto: CreateFeatureDto) {
    return this.service.createFeature(dto);
  }

  // ─── Assignations ─────────────────────────────────────────

  @Get('assignments')
  @ApiOperation({ summary: 'Liste toutes les assignations profil/feature' })
  findAllAssignments() {
    return this.service.findAllAssignments();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Assigner une feature à un profil (admin)' })
  @ApiBearerAuth()
  assignFeature(@Body() dto: AssignFeatureDto) {
    return this.service.assignFeature(dto.profil_id, dto.feature_id);
  }

  @Delete(':profilId/:featureId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireFeature('ACCEDER_ADMIN')
  @ApiOperation({ summary: 'Retirer une feature d\'un profil (admin)' })
  @ApiBearerAuth()
  removeAssignment(
    @Param('profilId', ParseIntPipe) profilId: number,
    @Param('featureId', ParseIntPipe) featureId: number,
  ) {
    return this.service.removeAssignment(profilId, featureId);
  }
}
