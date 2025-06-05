import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageModule } from './message/message.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from './auth/auth.module';
import { WebSocketModule } from './websocket/websocket.module';
import { GrpcModule } from './grpc/grpc.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from '@chat/shared/infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.docker', '.env.production', '.env'],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    MessageModule,
    RoomModule,
    AuthModule,
    WebSocketModule,
    GrpcModule,
    EventsModule,
    QueueModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
