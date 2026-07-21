import { Module } from '@nestjs/common';
import { EditionController } from './edition.controller';
import { EditionService } from './edition.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [EditionController],
  providers: [EditionService],
})
export class EditionModule {}
