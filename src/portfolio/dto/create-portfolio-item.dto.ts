import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreatePortfolioItemDto {
  @ApiProperty({ example: 'data:image/jpeg;base64,/9j/4...' })
  @IsString()
  image: string;

  @ApiPropertyOptional({ example: 'Ancestral Futures' })
  @IsString()
  @IsOptional()
  titre?: string;

  @ApiPropertyOptional({ example: 'Série d’illustrations inspirée des racines ouest-africaines' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'art' })
  @IsString()
  @IsOptional()
  categorie?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  annee?: number;
}
