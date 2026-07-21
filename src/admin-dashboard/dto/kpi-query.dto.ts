import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class KpiQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Date de début (ISO)' })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-07-19', description: 'Date de fin (ISO)' })
  @IsString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month', 'year'], description: 'Période prédéfinie' })
  @IsString()
  @IsIn(['day', 'week', 'month', 'year'])
  @IsOptional()
  period?: string;
}
