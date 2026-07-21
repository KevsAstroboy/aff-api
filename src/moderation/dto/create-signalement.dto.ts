import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsIn } from 'class-validator';

export class CreateSignalementDto {
  @ApiProperty({ example: 1, description: '1=Publication, 2=Commentaire, 3=Utilisateur' })
  @IsInt()
  @IsIn([1, 2, 3])
  cible_type_id: number;

  @ApiProperty({ example: 42 })
  @IsInt()
  cible_id: number;

  @ApiPropertyOptional({ example: 'Contenu inapproprié' })
  @IsString()
  motif: string;

  @ApiProperty({ example: 1, description: '1=Faible, 2=Moyen, 3=Élevé' })
  @IsInt()
  severite_id: number;
}
