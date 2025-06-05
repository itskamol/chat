import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  MessageNotificationJobData,
  EmailNotificationJobData,
  PushNotificationJobData,
} from './processors/message-notification.processor';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('message-notifications') private messageNotificationQueue: Queue,
  ) {}

  async addMessageNotificationJob(data: MessageNotificationJobData, delay = 0) {
    try {
      const job = await this.messageNotificationQueue.add(
        'send-message-notification',
        data,
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Message notification job added with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add message notification job', error.stack);
      throw error;
    }
  }

  async addEmailNotificationJob(data: EmailNotificationJobData, delay = 0) {
    try {
      const job = await this.messageNotificationQueue.add(
        'send-email-notification',
        data,
        {
          delay,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Email notification job added with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add email notification job', error.stack);
      throw error;
    }
  }

  async addPushNotificationJob(data: PushNotificationJobData, delay = 0) {
    try {
      const job = await this.messageNotificationQueue.add(
        'send-push-notification',
        data,
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Push notification job added with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error('Failed to add push notification job', error.stack);
      throw error;
    }
  }

  async getJobStats() {
    try {
      const waiting = await this.messageNotificationQueue.getWaiting();
      const active = await this.messageNotificationQueue.getActive();
      const completed = await this.messageNotificationQueue.getCompleted();
      const failed = await this.messageNotificationQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get job stats', error.stack);
      throw error;
    }
  }

  async cleanJobs() {
    try {
      await this.messageNotificationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24h
      await this.messageNotificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
      
      this.logger.log('Queue cleanup completed');
    } catch (error) {
      this.logger.error('Failed to clean queue', error.stack);
      throw error;
    }
  }
}
