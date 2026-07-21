import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class PublicVoteDto {
  @ApiProperty({ example: 1, description: 'ID de la candidature (categorie_id auto-set par trigger DB)' })
  @IsInt()
  candidature_id: number;
}
