import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateMasterclassDto {
  @ApiPropertyOptional({
    example: 1,
    description: "ID de l'événement (optionnel — masterclass autonome si absent)",
  })
  @IsInt()
  @IsOptional()
  evenement_id?: number;

  @ApiPropertyOptional({
    example: "Direction artistique dans le cinéma africain",
    description: 'Titre de la masterclass (hérité de l’événement si evenement_id fourni, sinon obligatoire)',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  titre?: string;

  @ApiPropertyOptional({
    example: "Explorer les enjeux de la direction artistique.",
    description: 'Description de la masterclass',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-03', description: 'Date (jour) de la masterclass' })
  @IsString()
  @IsOptional()
  jour?: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Heure de début (HH:MM)' })
  @IsString()
  @IsOptional()
  heure_debut?: string;

  @ApiPropertyOptional({ example: '15:00', description: 'Heure de fin (HH:MM)' })
  @IsString()
  @IsOptional()
  heure_fin?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID du lieu (obligatoire si mode présentiel)' })
  @IsInt()
  @IsOptional()
  lieu_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de la communauté' })
  @IsInt()
  @IsOptional()
  communaute_id?: number;

  @ApiProperty({ example: 1, description: '1=Presentiel, 2=Distanciel' })
  @IsInt()
  mode_diffusion_id: number;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'URL de la réunion (obligatoire si mode distanciel)',
  })
  @IsString()
  @MaxLength(255)
  @ValidateIf((o) => o.mode_diffusion_id === 2)
  @IsOptional()
  meeting_url?: string;

  @ApiPropertyOptional({
    example: 'Oumou Sangaré',
    description: "Nom de l'expert (peut être externe au système)",
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  expert?: string;

  @ApiPropertyOptional({ example: 50, description: 'Nombre maximum de participants' })
  @IsInt()
  @IsOptional()
  max_participants?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Statut de la masterclass (2=En direct, 3=Terminée, 4=Annulée, 1=En attente)',
  })
  @IsInt()
  @IsOptional()
  statut_id?: number;
}