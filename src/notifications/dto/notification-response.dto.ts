import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'comment', enum: ['comment', 'reaction', 'follow', 'masterclass_live', 'award'] })
  type: string;

  @ApiProperty({ example: 'Nouveau commentaire' })
  title: string;

  @ApiPropertyOptional({ example: 'John a commenté votre publication' })
  body?: string;

  @ApiPropertyOptional({ example: '/publications/5' })
  link?: string;

  @ApiProperty({ example: false })
  is_read: boolean;

  @ApiProperty({ example: '2026-07-21T10:00:00.000Z' })
  created_at: string;
}
