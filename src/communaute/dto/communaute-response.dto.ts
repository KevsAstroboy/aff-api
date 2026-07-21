import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommunauteResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Tech & Innovation' })
  libelle: string;

  @ApiProperty({ example: 'TECH_INNOVATION' })
  code: string;

  @ApiPropertyOptional({ example: 'Communauté dédiée aux passionnés de technologie' })
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  couleur?: string;

  @ApiPropertyOptional({ example: '/uploads/communautes/tech.png' })
  icon_path?: string;

  @ApiProperty({ example: 42 })
  membres_count: number;

  @ApiProperty({ example: 15 })
  publications_count: number;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;
}
