import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  conversation_id: number;

  @ApiProperty({ example: 'Salut tout le monde !' })
  @IsString()
  @MaxLength(5000)
  contenu: string;

  @ApiPropertyOptional({ example: '/uploads/chat/image123.png' })
  @IsString()
  @IsOptional()
  attachment_url?: string;
}
