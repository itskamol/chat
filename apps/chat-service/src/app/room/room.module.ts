import { Module, forwardRef } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { DatabaseModule } from '@chat/shared/infrastructure';
import { EventsModule } from '../events';

@Module({
  imports: [DatabaseModule, forwardRef(() => EventsModule)],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule { }
