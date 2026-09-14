import { Module } from '@nestjs/common';
import { LieuController } from './lieu.controller';
import { LieuService } from './lieu.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LieuController],
  providers: [LieuService],
})
export class LieuModule {}