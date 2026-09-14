import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCommentStatutDto {
  @ApiProperty({ example: true, description: 'Masquer le commentaire' })
  @IsBoolean()
  is_hidden: boolean;

  @ApiPropertyOptional({ example: 'Spam', description: 'Raison de la modération' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  hidden_reason?: string;
}
