import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateCandidatureDto {
  @ApiProperty({ example: 1, description: 'ID de la catégorie' })
  @IsInt()
  categorie_id: number;

  @ApiProperty({ example: 1, description: "ID de l'édition" })
  @IsInt()
  edition_id: number;

  @ApiPropertyOptional({ example: 'Description du projet candidat' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://portfolio.example.com' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  portfolio_url?: string;
}
