import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateEditionDto {
  @ApiProperty({ example: 2025 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  annee: number;

  @ApiProperty({ example: 'Africa Film Festival 2025' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ example: 'Abidjan' })
  @IsString()
  @IsOptional()
  ville?: string;

  @ApiPropertyOptional({ example: 'Palais des Congrès' })
  @IsString()
  @IsOptional()
  lieu?: string;

  @ApiPropertyOptional({ example: '2025-07-01', description: 'Date de début' })
  @IsString()
  @IsOptional()
  date_debut?: string;

  @ApiPropertyOptional({ example: '2025-07-10', description: 'Date de fin' })
  @IsString()
  @IsOptional()
  date_fin?: string;

  @ApiPropertyOptional({ example: '2025-06-01T00:00:00.000Z', description: 'Deadline de candidature' })
  @IsString()
  @IsOptional()
  candidature_deadline?: string;

  @ApiPropertyOptional({ example: '2025-07-05T20:00:00.000Z', description: 'Date de la cérémonie' })
  @IsString()
  @IsOptional()
  ceremonie_date?: string;

  @ApiPropertyOptional({ example: 1, description: '1=Brouillon, 2=Publiée, 3=En cours, 4=Terminée', default: 1 })
  @IsInt()
  @IsOptional()
  statut_id?: number;
}
