import { Module, forwardRef } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { DatabaseModule } from '@chat/shared/infrastructure';
import { EventsModule } from '../events';

@Module({
  imports: [DatabaseModule, forwardRef(() => EventsModule)],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
