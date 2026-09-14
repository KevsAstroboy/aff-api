import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureProfilController } from './feature-profil.controller';
import { FeatureProfilService } from './feature-profil.service';

@Module({
  imports: [AuthModule],
  controllers: [FeatureProfilController],
  providers: [FeatureProfilService],
})
export class FeatureProfilModule {}
