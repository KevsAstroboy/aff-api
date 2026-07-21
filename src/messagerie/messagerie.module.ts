import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';
import { AuthModule } from '../auth/auth.module';
import { MessagerieController } from './messagerie.controller';
import { MessagerieService } from './messagerie.service';
import { MessagerieGateway } from './messagerie.gateway';
import { MessageSchema } from './schemas/message.schema';
import { MESSAGE_MODEL } from './message.constants';

@Module({
  imports: [AuthModule],
  controllers: [MessagerieController],
  providers: [
    {
      provide: MESSAGE_MODEL,
      useFactory: async (config: ConfigService) => {
        await mongoose.connect(config.getOrThrow('MONGO_URI'));
        return mongoose.model('Message', MessageSchema);
      },
      inject: [ConfigService],
    },
    MessagerieService,
    MessagerieGateway,
  ],
  exports: [MESSAGE_MODEL],
})
export class MessagerieModule {}
