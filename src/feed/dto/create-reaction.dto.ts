import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateReactionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  publication_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  reaction_type_id: number;
}
