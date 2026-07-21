import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StatutEditionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Brouillon' })
  libelle: string;

  @ApiProperty({ example: 'brouillon' })
  code: string;
}

export class EditionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2025 })
  annee: number;

  @ApiProperty({ example: 'Africa Film Festival 2025' })
  nom: string;

  @ApiPropertyOptional({ example: 'Abidjan' })
  ville?: string;

  @ApiPropertyOptional({ example: 'Palais des Congrès' })
  lieu?: string;

  @ApiPropertyOptional({ example: '2025-07-01' })
  date_debut?: string;

  @ApiPropertyOptional({ example: '2025-07-10' })
  date_fin?: string;

  @ApiPropertyOptional({ example: '2025-06-01T00:00:00.000Z' })
  candidature_deadline?: string;

  @ApiPropertyOptional({ example: '2025-07-05T20:00:00.000Z' })
  ceremonie_date?: string;

  @ApiPropertyOptional({ type: StatutEditionDto })
  statut?: StatutEditionDto;

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-18T12:30:00.000Z' })
  updated_at: string;
}
