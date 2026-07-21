import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ngP@ss!' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(255)
  nom: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(255)
  prenom: string;

  @ApiProperty({ example: '+2250102030405' })
  @IsString()
  @MaxLength(255)
  phone_numb: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la communauté à rejoindre' })
  @IsInt()
  @IsOptional()
  communaute_id?: number;

  @ApiPropertyOptional({ example: 'Développeur passionné' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
