import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { FeedModule } from './feed/feed.module';
import { CommunauteModule } from './communaute/communaute.module';
import { AwardsModule } from './awards/awards.module';
import { ProgrammeModule } from './programme/programme.module';
import { EditionModule } from './edition/edition.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { MessagerieModule } from './messagerie/messagerie.module';
import { MediaModule } from './media/media.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    StorageModule,
    FeedModule,
    CommunauteModule,
    AwardsModule,
    ProgrammeModule,
    EditionModule,
    ModerationModule,
    AdminDashboardModule,
    MessagerieModule,
    MediaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
