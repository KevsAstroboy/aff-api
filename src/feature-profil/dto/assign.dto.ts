import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignFeatureDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  profil_id: number;

  @ApiProperty({ example: 11 })
  @IsInt()
  feature_id: number;
}
