import { Module } from '@nestjs/common';
import { ProgrammeController } from './programme.controller';
import { ProgrammeService } from './programme.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProgrammeController],
  providers: [ProgrammeService],
})
export class ProgrammeModule {}
