import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 1500 })
  total_users: number;

  @ApiProperty({ example: 3200 })
  total_publications: number;

  @ApiProperty({ example: 5400 })
  total_commentaires: number;

  @ApiProperty({ example: 12800 })
  total_reactions: number;

  @ApiProperty({ example: 12 })
  total_signalements_ouverts: number;

  @ApiProperty({ example: 1 })
  editions_actives: number;

  @ApiProperty({ example: 5 })
  total_masterclass: number;

  @ApiProperty({ example: 120 })
  total_inscriptions_masterclass: number;

  @ApiProperty({ example: 8 })
  new_users_today: number;

  @ApiProperty({ example: 45 })
  new_publications_today: number;
}
