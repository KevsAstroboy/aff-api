import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class JuryVoteDto {
  @ApiProperty({ example: 1, description: 'ID de la candidature' })
  @IsInt()
  candidature_id: number;

  @ApiProperty({ example: 85, description: 'Score (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional({ example: 'Très bon projet, bien présenté' })
  @IsString()
  @IsOptional()
  commentaire?: string;
}
