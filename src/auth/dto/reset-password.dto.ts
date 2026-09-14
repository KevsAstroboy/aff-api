import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6)
  otp_code: string;

  @ApiProperty({ example: 'NewStr0ngP@ss!' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  new_password: string;
}
