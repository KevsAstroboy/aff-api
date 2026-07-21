import { ApiProperty } from '@nestjs/swagger';

class SignalementItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Contenu inapproprié' })
  motif: string;

  @ApiProperty({ example: 1 })
  cible_type_id: number;

  @ApiProperty({ example: 42 })
  cible_id: number;

  @ApiProperty({ example: 1 })
  severite_id: number;

  @ApiProperty({ example: 1 })
  statut_id: number;

  @ApiProperty({ example: '2025-07-18T10:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: 'john_doe' })
  signaleur_username: string;
}

export class RecentSignalementsDto {
  @ApiProperty({ type: [SignalementItemDto] })
  data: SignalementItemDto[];

  @ApiProperty({ example: 10 })
  total: number;
}
