import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class CreateReactionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsOptional()
  publication_id?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  reaction_type_id: number;
}
