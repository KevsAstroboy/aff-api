import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 1, description: "ID de l'édition" })
  @IsInt()
  edition_id: number;

  @ApiProperty({ example: 1, description: 'ID du thème' })
  @IsInt()
  theme_id: number;

  @ApiProperty({ example: 'Meilleur Film' })
  @IsString()
  @MaxLength(255)
  libelle: string;

  @ApiProperty({ example: 'MEILLEUR_FILM' })
  @IsString()
  @MaxLength(255)
  code: string;

  @ApiPropertyOptional({ example: 'Catégorie récompensant le meilleur film' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Grand prix de la compétition' })
  @IsBoolean()
  @IsOptional()
  is_grand_prix?: boolean;
}
