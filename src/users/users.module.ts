import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [PortfolioModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
