import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TypeEvenementDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Conférence' })
  libelle: string;

  @ApiProperty({ example: 'CONFERENCE' })
  code: string;
}

class LieuDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Salle Plénière' })
  libelle: string;

  @ApiPropertyOptional({ example: 500 })
  capacite?: number;
}

class EditionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Africa Future Festival 2025' })
  nom: string;

  @ApiPropertyOptional({ example: 2025 })
  annee?: number;
}

class ModeDiffusionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Presentiel' })
  libelle: string;

  @ApiProperty({ example: 'PRESENTIEL' })
  code: string;
}

class CommunauteDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Tech & Innovation' })
  libelle: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  couleur?: string;
}

class MasterclassDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 1 })
  communaute_id?: number;

  @ApiProperty({ example: 1 })
  mode_diffusion_id: number;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  meeting_url?: string;

  @ApiPropertyOptional({ example: 50 })
  max_participants?: number;

  @ApiProperty({ example: 12 })
  participants_count: number;

  @ApiPropertyOptional({ type: ModeDiffusionDto })
  mode_diffusion?: ModeDiffusionDto;

  @ApiPropertyOptional({ type: CommunauteDto })
  communaute?: CommunauteDto;
}

export class EvenementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  edition_id: number;

  @ApiProperty({ example: 1 })
  type_evenement_id: number;

  @ApiProperty({ example: "Discours d'ouverture" })
  titre: string;

  @ApiPropertyOptional({ example: 'Description de la cérémonie' })
  description?: string;

  @ApiProperty({ example: '2025-07-18' })
  jour: string;

  @ApiProperty({ example: '09:00:00' })
  heure_debut: string;

  @ApiProperty({ example: '11:00:00' })
  heure_fin: string;

  @ApiPropertyOptional({ example: 1 })
  lieu_id?: number;

  @ApiProperty({ example: false })
  is_hot: boolean;

  @ApiProperty({ example: false })
  is_favori: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiPropertyOptional({ type: TypeEvenementDto })
  type_evenement?: TypeEvenementDto;

  @ApiPropertyOptional({ type: LieuDto })
  lieu?: LieuDto;

  @ApiPropertyOptional({ type: EditionDto })
  edition?: EditionDto;

  @ApiPropertyOptional({ type: MasterclassDto })
  masterclass?: MasterclassDto;
}
