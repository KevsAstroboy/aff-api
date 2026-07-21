import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn } from 'class-validator';

export class UpdateSignalementDto {
  @ApiProperty({ example: 2, description: '1=Ouvert, 2=Resolu, 3=Classe' })
  @IsInt()
  @IsIn([1, 2, 3])
  statut_id: number;
}
