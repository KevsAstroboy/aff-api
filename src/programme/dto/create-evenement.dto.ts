import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEvenementDto {
  @ApiProperty({ example: 1, description: "ID de l'édition" })
  @IsInt()
  edition_id: number;

  @ApiProperty({ example: 1, description: "ID du type d'événement" })
  @IsInt()
  type_evenement_id: number;

  @ApiProperty({ example: "Discours d'ouverture" })
  @IsString()
  @MaxLength(255)
  titre: string;

  @ApiPropertyOptional({ example: 'Description de la cérémonie' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2025-07-18', description: 'Date de l\'événement (YYYY-MM-DD)' })
  @IsDateString()
  jour: string;

  @ApiProperty({ example: '09:00:00', description: "Heure de début (HH:mm:ss)" })
  @Matches(/^\d{2}:\d{2}:\d{2}$/, { message: "heure_debut must be in HH:mm:ss format" })
  heure_debut: string;

  @ApiProperty({ example: '11:00:00', description: "Heure de fin (HH:mm:ss)" })
  @Matches(/^\d{2}:\d{2}:\d{2}$/, { message: "heure_fin must be in HH:mm:ss format" })
  heure_fin: string;

  @ApiPropertyOptional({ example: 1, description: 'ID du lieu' })
  @IsInt()
  @IsOptional()
  lieu_id?: number;

  @ApiPropertyOptional({ example: false, description: 'Événement mis en avant', default: false })
  @IsBoolean()
  @IsOptional()
  is_hot?: boolean;
}
