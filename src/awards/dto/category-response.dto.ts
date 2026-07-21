import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ThemeInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Cinéma' })
  libelle: string;

  @ApiProperty({ example: 'CINEMA' })
  code: string;

  @ApiProperty({ example: 1 })
  ordre: number;
}

class EditionInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 2025 })
  annee: number;

  @ApiProperty({ example: 'AFF 2025' })
  nom: string;

  @ApiProperty({ example: 'Abidjan' })
  ville: string;
}

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  edition_id: number;

  @ApiProperty({ example: 1 })
  theme_id: number;

  @ApiProperty({ example: 'Meilleur Film' })
  libelle: string;

  @ApiProperty({ example: 'MEILLEUR_FILM' })
  code: string;

  @ApiPropertyOptional({ example: 'Catégorie récompensant le meilleur film' })
  description?: string;

  @ApiProperty({ example: false })
  is_grand_prix: boolean;

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  created_at: string;

  @ApiPropertyOptional({ type: ThemeInfoDto })
  award_theme?: ThemeInfoDto;

  @ApiPropertyOptional({ type: EditionInfoDto })
  edition?: EditionInfoDto;
}
