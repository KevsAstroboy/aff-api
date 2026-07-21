import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
  IsInt,
  ArrayMinSize,
} from 'class-validator';

export class CreateUserAdminDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

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

  @ApiProperty({ example: [1, 2, 4], description: 'IDs des profils à assigner' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  profil_ids: number[];

  @ApiPropertyOptional({ example: false, description: 'Compte officiel AFF' })
  @IsBoolean()
  @IsOptional()
  is_officiel?: boolean;
}
