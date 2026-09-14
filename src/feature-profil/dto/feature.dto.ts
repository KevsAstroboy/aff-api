import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateFeatureDto {
  @ApiProperty({ example: 'CREER_PUBLICATION' })
  @IsString()
  @MaxLength(255)
  code: string;

  @ApiProperty({ example: 'Créer une publication' })
  @IsString()
  @MaxLength(255)
  libelle: string;

  @ApiPropertyOptional({ example: 'Permet de créer une publication dans le feed' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10, description: 'ID du feature parent pour la hiérarchie' })
  @IsInt()
  @Min(1)
  @IsOptional()
  parent_id?: number;
}

export class FeatureResponseDto {
  @ApiProperty({ example: 11 })
  id: number;

  @ApiProperty({ example: 'CREER_PUBLICATION' })
  code: string;

  @ApiProperty({ example: 'Créer une publication' })
  libelle: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10 })
  parent_id?: number;
}
