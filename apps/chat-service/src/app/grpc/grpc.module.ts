import { Module } from '@nestjs/common';
import { ChatGrpcService } from './chat-grpc.service';
import { MessageModule } from '../message/message.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [MessageModule, RoomModule],
  providers: [ChatGrpcService],
  exports: [ChatGrpcService],
})
export class GrpcModule {}
