import { ApiProperty } from '@nestjs/swagger';

export class UserStatsDto {
  @ApiProperty({ example: 1500 })
  total_users: number;

  @ApiProperty({ example: 890 })
  active_users: number;

  @ApiProperty({ example: 32 })
  new_users_this_week: number;

  @ApiProperty({ example: 140 })
  new_users_this_month: number;
}
