import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  prenom?: string;

  @ApiPropertyOptional({ example: '+2250102030405' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  phone_numb?: string;

  @ApiPropertyOptional({ example: 'Développeur passionné' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
