import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CommentUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiPropertyOptional({ example: '/uploads/profiles/1/avatar.jpg' })
  profile_picture_path?: string;
}

export class CommentaireResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  publication_id: number;

  @ApiProperty({ example: 'Super publication !' })
  contenu: string;

  @ApiPropertyOptional({ example: 5 })
  parent_commentaire_id?: number;

  @ApiProperty({ type: CommentUserDto })
  user: CommentUserDto;

  @ApiProperty({ type: [CommentaireResponseDto], description: 'Réponses (max 1 niveau)' })
  replies: CommentaireResponseDto[];

  @ApiProperty({ example: '2025-07-18T12:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-18T12:30:00.000Z' })
  updated_at: string;
}
