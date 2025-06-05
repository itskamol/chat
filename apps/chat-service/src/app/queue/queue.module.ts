import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { MessageNotificationProcessor } from './processors/message-notification.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('QUEUE_REDIS_HOST') || 'localhost',
          port: configService.get<number>('QUEUE_REDIS_PORT') || 6379,
          password: configService.get<string>('QUEUE_REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'message-notifications',
    }),
  ],
  providers: [QueueService, MessageNotificationProcessor],
  exports: [QueueService],
})
export class QueueModule {}
