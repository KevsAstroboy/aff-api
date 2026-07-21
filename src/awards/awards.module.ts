import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';

@Module({
  imports: [AuthModule],
  controllers: [AwardsController],
  providers: [AwardsService],
})
export class AwardsModule {}
