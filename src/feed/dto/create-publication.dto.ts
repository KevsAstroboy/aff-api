import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreatePublicationDto {
  @ApiProperty({ example: 'Contenu de la publication' })
  @IsString()
  contenu: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'NULL = publication officielle globale',
  })
  @IsInt()
  @IsOptional()
  communaute_id?: number;

  @ApiPropertyOptional({
    example: ['AFF2026', 'Cinema'],
    description: 'Liste de hashtags (créés automatiquement si inexistants)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  hashtags?: string[];

  @ApiPropertyOptional({
    example: ['data:image/jpeg;base64,/9j/4...'],
    description: 'Images en base64 avec préfixe mimetype (max 5, 5 Mo chacune)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsOptional()
  images?: string[];
}
