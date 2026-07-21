import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCommentaireDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  publication_id: number;

  @ApiProperty({ example: 'Super publication !' })
  @IsString()
  contenu: string;

  @ApiPropertyOptional({ example: 5, description: 'ID du commentaire parent (max 1 niveau)' })
  @IsInt()
  @IsOptional()
  parent_commentaire_id?: number;
}
