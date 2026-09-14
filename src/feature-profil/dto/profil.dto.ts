import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateProfilDto {
  @ApiProperty({ example: 'Participant' })
  @IsString()
  @MaxLength(255)
  libelle: string;

  @ApiProperty({ example: 'PARTICIPANT' })
  @IsString()
  @MaxLength(255)
  code: string;

  @ApiPropertyOptional({ example: 'Utilisateur standard' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, description: '1=User, 5=Moderator, 9=Admin' })
  @IsInt()
  @Min(1)
  niveau: number;
}

export class UpdateProfilDto {
  @ApiPropertyOptional({ example: 'Participant' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  libelle?: string;

  @ApiPropertyOptional({ example: 'PARTICIPANT' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Utilisateur standard' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  niveau?: number;
}

export class ProfilResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Participant' })
  libelle: string;

  @ApiProperty({ example: 'PARTICIPANT' })
  code: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ example: 1 })
  niveau: number;
}
