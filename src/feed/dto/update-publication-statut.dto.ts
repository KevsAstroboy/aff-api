import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn } from 'class-validator';

export class UpdatePublicationStatutDto {
  @ApiProperty({ enum: [1, 2, 3, 4], description: '1=Publié, 2=En attente, 3=Rejeté, 4=Signalé' })
  @IsInt()
  @IsIn([1, 2, 3, 4])
  statut_id: number;
}
