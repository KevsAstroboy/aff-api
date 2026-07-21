import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateInscriptionDto {
  @ApiProperty({ example: 3, description: '1=Expert, 2=Moderateur, 3=Participant' })
  @IsInt()
  role_id: number;
}
