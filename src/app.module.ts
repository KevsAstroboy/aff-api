import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { NotificationsModule } from './notifications/notifications.module';
import { FeatureProfilModule } from './feature-profil/feature-profil.module';
import { LieuModule } from './lieu/lieu.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
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
    NotificationsModule,
    FeatureProfilModule,
    LieuModule,
    PortfolioModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
