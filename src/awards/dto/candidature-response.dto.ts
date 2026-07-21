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
}

class CategoryInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Meilleur Film' })
  libelle: string;

  @ApiProperty({ example: 'MEILLEUR_FILM' })
  code: string;
}

class StatutInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'En attente' })
  libelle: string;

  @ApiProperty({ example: 'EN_ATTENTE' })
  code: string;
}

class MediaInfoDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  media_type_id: number;

  @ApiProperty({ example: 'IMAGE' })
  media_type_code: string;

  @ApiProperty({ example: 'http://minio:9000/awards/1/image_1.jpg' })
  file_path: string;

  @ApiProperty({ example: 1 })
  ordre: number;
}

export class CandidatureResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  user_id: number;

  @ApiProperty({ example: 1 })
  categorie_id: number;

  @ApiProperty({ example: 1 })
  edition_id: number;

  @ApiProperty({ example: 'Description du projet candidat' })
  description: string;

  @ApiPropertyOptional({ example: 'https://portfolio.example.com' })
  portfolio_url?: string;

  @ApiProperty({ example: 1 })
  statut_id: number;

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  submitted_at: string;

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  updated_at: string;

  @ApiPropertyOptional({ type: UserInfoDto })
  user?: UserInfoDto;

  @ApiPropertyOptional({ type: CategoryInfoDto })
  award_category?: CategoryInfoDto;

  @ApiPropertyOptional({ type: StatutInfoDto })
  statut_candidature?: StatutInfoDto;

  @ApiPropertyOptional({ type: [MediaInfoDto] })
  candidature_media?: MediaInfoDto[];
}
