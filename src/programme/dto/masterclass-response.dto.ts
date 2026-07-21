import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InscriptionParticipantDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  user_id: number;

  @ApiProperty({ example: 3 })
  role_id: number;

  @ApiProperty({ example: 'Participant' })
  role_libelle: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  inscrit_at: string;

  @ApiPropertyOptional({ example: 'Jean' })
  user_prenom?: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  user_nom?: string;

  @ApiPropertyOptional({ example: 'jean.dupont@email.com' })
  user_email?: string;
}

export class MasterclassResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  evenement_id: number;

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

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiPropertyOptional({ example: "Discours d'ouverture" })
  evenement_titre?: string;

  @ApiPropertyOptional({ example: '2025-07-18' })
  evenement_jour?: string;

  @ApiPropertyOptional({ example: 'Presentiel' })
  mode_diffusion_libelle?: string;

  @ApiPropertyOptional({ example: 'Tech & Innovation' })
  communaute_libelle?: string;

  @ApiPropertyOptional({ type: [InscriptionParticipantDto] })
  inscriptions?: InscriptionParticipantDto[];
}
