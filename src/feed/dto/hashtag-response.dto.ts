import { ApiProperty } from '@nestjs/swagger';

export class HashtagResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'AFF2025' })
  libelle: string;

  @ApiProperty({ example: 12, description: 'Nombre de publications avec ce hashtag' })
  publications_count: number;
}
