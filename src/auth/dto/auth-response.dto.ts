import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John' })
  nom?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  prenom?: string;

  @ApiPropertyOptional({ example: 'Développeur passionné' })
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/profiles/1/avatar.jpg' })
  profile_picture_path?: string;

  @ApiProperty({ example: false })
  is_officiel: boolean;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: false, description: 'Si true, le front doit rediriger vers /change-password' })
  is_default_password: boolean;

  @ApiPropertyOptional({ example: [1, 3], description: 'IDs des communautés de l\'utilisateur' })
  communaute_ids?: number[];
}

class AuthProfilDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Participant' })
  libelle: string;

  @ApiProperty({ example: 'PARTICIPANT' })
  code: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user: AuthUserDto;

  @ApiProperty({ type: [AuthProfilDto] })
  profils: AuthProfilDto[];

  @ApiProperty({
    example: [
      'CREER_PUBLICATION',
      'REAGIR',
      'COMMENTER',
      'MODIFIER_PROFIL',
    ],
  })
  features: string[];

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiam9obl9kb2UiLCJpYXQiOjE3MTYwMDAwMDAsImV4cCI6MTcxNjYwNDgwMH0.abc123',
  })
  access_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: string;
}
