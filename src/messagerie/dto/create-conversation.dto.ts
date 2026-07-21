import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 1, description: '1 = Direct, 2 = Groupe' })
  @IsInt()
  @Min(1)
  type_id: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'ID du second utilisateur (requis pour type Direct)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  user2_id?: number;

  @ApiPropertyOptional({
    example: 'Team Alpha',
    description: 'Nom du groupe (requis pour type Groupe)',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({
    example: 'Discussion privée du groupe Alpha',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
