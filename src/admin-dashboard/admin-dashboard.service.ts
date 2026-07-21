import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriteriaParser } from '../common/criteria/criteria-parser';
import { CriteriaBuilder } from '../common/criteria/criteria.builder';
import { PaginatedResponse } from '../common/criteria/types';
import { KpiQueryDto } from './dto/kpi-query.dto';

function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date): Date { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfWeek(d: Date): Date { const r = new Date(d); r.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); return startOfDay(r); }
function endOfWeek(d: Date): Date { return endOfDay(new Date(startOfWeek(d).getTime() + 6 * 86400000)); }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
function startOfYear(d: Date): Date { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date): Date { return endOfDay(new Date(d.getFullYear(), 11, 31)); }

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  private resolveDateRange(query?: KpiQueryDto): { start: Date; end: Date } {
    const now = new Date();

    if (query?.start_date && query?.end_date) {
      return { start: new Date(query.start_date), end: endOfDay(new Date(query.end_date)) };
    }

    switch (query?.period) {
      case 'day':   return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':  return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':  return { start: startOfYear(now), end: endOfYear(now) };
      default:      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  async getStats(query?: KpiQueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const [
      total_users,
      total_publications,
      total_commentaires,
      total_reactions,
      total_signalements_ouverts,
      editions_actives,
      total_masterclass,
      total_inscriptions_masterclass,
      new_users_today,
      new_publications_today,
    ] = await Promise.all([
      this.prisma.user.count({ where: { is_deleted: false } }),
      this.prisma.publication.count({ where: { is_deleted: false } }),
      this.prisma.commentaire.count({ where: { is_deleted: false } }),
      this.prisma.reaction.count({ where: { is_deleted: false } }),
      this.prisma.signalement.count({
        where: { is_deleted: false, statut_id: 1 },
      }),
      this.prisma.edition.count({
        where: { is_deleted: false, statut_id: 3 },
      }),
      this.prisma.masterclass.count({ where: { is_deleted: false } }),
      this.prisma.masterclass_inscription.count({
        where: { is_deleted: false },
      }),
      this.prisma.user.count({
        where: {
          is_deleted: false,
          created_at: { gte: start, lte: end },
        },
      }),
      this.prisma.publication.count({
        where: {
          is_deleted: false,
          created_at: { gte: start, lte: end },
        },
      }),
    ]);

    return {
      total_users,
      total_publications,
      total_commentaires,
      total_reactions,
      total_signalements_ouverts,
      editions_actives,
      total_masterclass,
      total_inscriptions_masterclass,
      new_users_period: new_users_today,
      new_publications_period: new_publications_today,
    };
  }

  async getRecentSignalements(query?: KpiQueryDto, limit = 10) {
    const { start, end } = this.resolveDateRange(query);
    const [data, total] = await Promise.all([
      this.prisma.signalement.findMany({
        where: {
          is_deleted: false,
          created_at: { gte: start, lte: end },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          motif: true,
          cible_type_id: true,
          cible_id: true,
          severite_id: true,
          statut_id: true,
          created_at: true,
          user_signalement_signale_par_user_idTouser: {
            select: { username: true },
          },
        },
      }),
      this.prisma.signalement.count({ where: { is_deleted: false } }),
    ]);

    return {
      data: data.map((s) => ({
        id: s.id,
        motif: s.motif,
        cible_type_id: s.cible_type_id,
        cible_id: s.cible_id,
        severite_id: s.severite_id,
        statut_id: s.statut_id,
        created_at: s.created_at ?? null,
        signaleur_username:
          s.user_signalement_signale_par_user_idTouser?.username ?? null,
      })),
      total,
    };
  }

  async getUserStats(query?: KpiQueryDto) {
    const { start, end } = this.resolveDateRange(query);

    const weekStart = startOfWeek(new Date());
    const monthStart = startOfMonth(new Date());

    const [total_users, active_users, new_users_period, new_users_this_week, new_users_this_month] =
      await Promise.all([
        this.prisma.user.count({ where: { is_deleted: false } }),
      this.prisma.user.count({
        where: { is_deleted: false, is_active: true },
      }),
      this.prisma.user.count({
        where: {
          is_deleted: false,
          created_at: { gte: start, lte: end },
        },
      }),
      this.prisma.user.count({
          where: {
            is_deleted: false,
            created_at: { gte: weekStart },
          },
        }),
        this.prisma.user.count({
          where: {
            is_deleted: false,
            created_at: { gte: monthStart },
          },
        }),
      ]);

    return {
      total_users,
      active_users,
      new_users_period,
      new_users_this_week,
      new_users_this_month,
    };
  }

  async getUsersByCriteria(query: Record<string, string>): Promise<PaginatedResponse<unknown>> {
    const criteria = new CriteriaParser().parse(query);
    const builder = new CriteriaBuilder('user');
    const { where, orderBy, skip, take, select, include } = builder.build(criteria);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { AND: [where, { is_deleted: false }] },
        ...(orderBy ? { orderBy } : {}),
        skip,
        take,
        ...(select ? { select } : {}),
        ...(include && !select ? { include } : {}),
      }),
      this.prisma.user.count({ where: { AND: [where, { is_deleted: false }] } }),
    ]);

    return {
      items,
      total,
      page: criteria.page,
      size: criteria.size,
      pages: Math.ceil(total / criteria.size),
    };
  }

  async getContentStats(query?: KpiQueryDto) {
    const { start, end } = this.resolveDateRange(query);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

    const publicationsRaw = await this.prisma.publication.findMany({
      where: {
        is_deleted: false,
        created_at: { gte: start, lte: end },
      },
      select: {
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const publicationsPerDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      publicationsPerDay[key] = 0;
    }

    for (const pub of publicationsRaw) {
      if (pub.created_at) {
        const key = pub.created_at.toISOString().split('T')[0];
        publicationsPerDay[key] = (publicationsPerDay[key] ?? 0) + 1;
      }
    }

    const pubByDay = Object.entries(publicationsPerDay).map(
      ([date, count]) => ({ date, count }),
    );

    const topCommunautes = await this.prisma.communaute.findMany({
      where: { is_deleted: false },
      select: {
        id: true,
        libelle: true,
        membres_count: true,
        publications_count: true,
      },
      orderBy: { publications_count: 'desc' },
      take: 10,
    });

    return {
      publications_per_day: pubByDay,
      top_communautes: topCommunautes,
    };
  }
}
