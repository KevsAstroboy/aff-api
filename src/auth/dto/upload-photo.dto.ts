import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UploadPhotoDto {
  @ApiProperty({
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    description: 'Image en base64 avec préfixe mimetype (max 5 Mo)',
  })
  @IsString()
  image: string;
}
