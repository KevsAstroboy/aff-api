import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateMasterclassDto {
  @ApiProperty({ example: 1, description: "ID de l'événement" })
  @IsInt()
  evenement_id: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de la communauté' })
  @IsInt()
  @IsOptional()
  communaute_id?: number;

  @ApiProperty({ example: 1, description: '1=Presentiel, 2=Distanciel' })
  @IsInt()
  mode_diffusion_id: number;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'URL de la réunion (obligatoire si mode distanciel)',
  })
  @IsString()
  @MaxLength(255)
  @ValidateIf((o) => o.mode_diffusion_id === 2)
  @IsOptional()
  meeting_url?: string;

  @ApiPropertyOptional({ example: 50, description: 'Nombre maximum de participants' })
  @IsInt()
  @IsOptional()
  max_participants?: number;
}
