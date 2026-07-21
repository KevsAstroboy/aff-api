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

class ReactionCountDto {
  @ApiProperty({ example: 1 })
  reaction_type_id: number;

  @ApiProperty({ example: 'like' })
  code: string;

  @ApiProperty({ example: '\uD83D\uDC4D' })
  emoji: string;

  @ApiProperty({ example: 5 })
  count: number;
}

class HashtagDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'AFF2025' })
  libelle: string;
}

export class PublicationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Contenu de la publication' })
  contenu: string;

  @ApiPropertyOptional({ example: 1 })
  communaute_id?: number;

  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto;

  @ApiProperty({ example: 3, description: 'Nombre total de commentaires' })
  commentaires_count: number;

  @ApiProperty({ type: [ReactionCountDto] })
  reactions: ReactionCountDto[];

  @ApiProperty({ type: [HashtagDto] })
  hashtags: HashtagDto[];

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-18T12:30:00.000Z' })
  updated_at: string;
}
