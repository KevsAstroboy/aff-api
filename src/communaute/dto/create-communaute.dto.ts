import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCommunauteDto {
  @ApiProperty({ example: 'Tech & Innovation' })
  @IsString()
  @MaxLength(255)
  libelle: string;

  @ApiProperty({ example: 'TECH_INNOVATION' })
  @IsString()
  @MaxLength(255)
  code: string;

  @ApiPropertyOptional({ example: 'Communauté dédiée aux passionnés de technologie' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  couleur?: string;

  @ApiPropertyOptional({ example: '/uploads/communautes/tech.png' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  icon_path?: string;
}
