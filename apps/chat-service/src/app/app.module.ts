import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageModule } from './message/message.module';
import { RoomModule } from './room/room.module';
import { DatabaseModule } from '@chat/shared/infrastructure';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    MessageModule,
    RoomModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
