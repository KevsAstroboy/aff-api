import { Module } from '@nestjs/common';
import { CommunauteController } from './communaute.controller';
import { CommunauteService } from './communaute.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CommunauteController],
  providers: [CommunauteService],
})
export class CommunauteModule {}
