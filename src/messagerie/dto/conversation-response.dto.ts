import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ParticipantDto {
  @ApiProperty({ example: 1 })
  user_id: number;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John Doe' })
  nom_complet: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/john.png' })
  profile_picture_path?: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  joined_at: string;

  @ApiProperty({ example: '2025-01-16T08:00:00.000Z' })
  dernier_lu_at?: string;
}

class LastMessageDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  _id: string;

  @ApiProperty({ example: 1 })
  sender_id: number;

  @ApiProperty({ example: 'Salut tout le monde !' })
  contenu: string;

  @ApiProperty({ example: 'text' })
  type: string;

  @ApiProperty({ example: '2025-01-16T08:30:00.000Z' })
  sent_at: string;
}

export class ConversationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1, description: '1 = Direct, 2 = Groupe' })
  type_id: number;

  @ApiPropertyOptional({ example: 'Team Alpha' })
  nom?: string;

  @ApiPropertyOptional({ example: 'Discussion privée du groupe Alpha' })
  description?: string;

  @ApiProperty({ example: false })
  is_canal_general: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  created_at: string;

  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiPropertyOptional({ type: LastMessageDto })
  last_message?: LastMessageDto;
}
