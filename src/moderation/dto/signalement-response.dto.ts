import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiPropertyOptional({ example: 'John' })
  nom?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  prenom?: string;

  @ApiPropertyOptional({ example: '/uploads/profiles/1/avatar.jpg' })
  profile_picture_path?: string;

  @ApiProperty({ example: false })
  is_officiel: boolean;
}

class CibleTypeInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Publication' })
  libelle: string;

  @ApiProperty({ example: 'PUBLICATION' })
  code: string;
}

class SeveriteInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Faible' })
  libelle: string;

  @ApiProperty({ example: 'FAIBLE' })
  code: string;
}

class StatutInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Ouvert' })
  libelle: string;

  @ApiProperty({ example: 'OUVERT' })
  code: string;
}

export class SignalementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  cible_type_id: number;

  @ApiProperty({ example: 42 })
  cible_id: number;

  @ApiProperty({ example: 3 })
  signale_par_user_id: number;

  @ApiProperty({ example: 'Contenu inapproprié' })
  motif: string;

  @ApiProperty({ example: 1 })
  severite_id: number;

  @ApiProperty({ example: 1 })
  statut_id: number;

  @ApiPropertyOptional({ example: 2 })
  resolu_par_user_id?: number;

  @ApiPropertyOptional({ example: '2025-07-18T12:00:00.000Z' })
  resolu_at?: string;

  @ApiProperty({ example: '2025-07-18T10:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-18T10:00:00.000Z' })
  updated_at: string;

  @ApiProperty({ type: UserInfoDto })
  signaleur: UserInfoDto;

  @ApiPropertyOptional({ type: UserInfoDto })
  resolueur?: UserInfoDto;

  @ApiProperty({ type: CibleTypeInfoDto })
  cible_type: CibleTypeInfoDto;

  @ApiProperty({ type: SeveriteInfoDto })
  severite: SeveriteInfoDto;

  @ApiProperty({ type: StatutInfoDto })
  statut: StatutInfoDto;
}
