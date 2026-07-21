import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  old_password: string;

  @ApiProperty({ example: 'NewStr0ngP@ss!' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  new_password: string;
}
