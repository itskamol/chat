import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    forwardRef(() => WebSocketModule),
  ],
  providers: [EventService],
  exports: [EventService, EventEmitterModule],
})
export class EventsModule {}
