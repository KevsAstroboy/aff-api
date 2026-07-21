import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john_doe',
    description: "Nom d'utilisateur ou adresse email",
  })
  @IsString()
  @MinLength(3)
  identifier: string;

  @ApiProperty({ example: 'Str0ngP@ss!' })
  @IsString()
  password: string;
}
