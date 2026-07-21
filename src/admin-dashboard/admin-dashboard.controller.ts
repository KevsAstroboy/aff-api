import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { RecentSignalementsDto } from './dto/recent-signalements.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequireFeature } from '../auth/guards/rbac.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
@RequireFeature('ACCEDER_ADMIN')
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales du dashboard admin' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques du dashboard',
    type: DashboardStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getStats(@Query() query: KpiQueryDto) {
    return this.adminDashboardService.getStats(query);
  }

  @Get('signalements/recent')
  @ApiOperation({ summary: 'Signalements récents' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  @ApiResponse({
    status: 200,
    description: 'Liste des signalements récents',
    type: RecentSignalementsDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getRecentSignalements(
    @Query() query: KpiQueryDto,
    @Query('limit') limit?: string,
  ) {
    return this.adminDashboardService.getRecentSignalements(
      query,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('users/stats')
  @ApiOperation({ summary: 'Statistiques utilisateurs' })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  @ApiResponse({
    status: 200,
    description: 'Statistiques utilisateurs',
    type: UserStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getUserStats(@Query() query: KpiQueryDto) {
    return this.adminDashboardService.getUserStats(query);
  }

  @Get('users/get-by-criteria')
  @ApiOperation({
    summary: 'Recherche avancée',
    description: 'Filtres, tri, pagination. Opérateurs: eq, neq, gt, gte, lt, lte, in, nin, like, bt, btio, btoi, btoo, null, nnull. Ex: ?libelle.like=art&sort=-created_at&page=1&size=20&fields=id,libelle&include=relation1,relation2',
  })
  @ApiResponse({ status: 200, description: 'Résultats paginés' })
  async getUsersByCriteria(@Query() query: Record<string, string>) {
    return this.adminDashboardService.getUsersByCriteria(query);
  }

  @Get('content/stats')
  @ApiOperation({ summary: 'Statistiques contenu' })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  @ApiResponse({
    status: 200,
    description: 'Statistiques contenu (publications/jour, top communautés)',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getContentStats(@Query() query: KpiQueryDto) {
    return this.adminDashboardService.getContentStats(query);
  }
}
