import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLieuDto {
  @ApiProperty({ example: 'Grande scène', description: 'Libellé du lieu' })
  @IsString()
  @MaxLength(255)
  libelle: string;

  @ApiPropertyOptional({ example: 200, description: 'Capacité d’accueil' })
  @IsInt()
  @IsOptional()
  capacite?: number;
}