import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      clean: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('message-notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addMessageNotificationJob', () => {
    it('should add message notification job successfully', async () => {
      const jobData = {
        messageId: 'msg-1',
        senderId: 'user-1',
        recipientIds: ['user-2', 'user-3'],
        roomId: 'room-1',
        content: 'Hello, World!',
        timestamp: new Date(),
      };

      const mockJob = { id: 'job-1' };
      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.addMessageNotificationJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message-notification',
        jobData,
        {
          delay: 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );
      expect(result).toBe(mockJob);
    });

    it('should add message notification job with delay', async () => {
      const jobData = {
        messageId: 'msg-1',
        senderId: 'user-1',
        recipientIds: ['user-2'],
        roomId: 'room-1',
        content: 'Hello!',
        timestamp: new Date(),
      };

      const mockJob = { id: 'job-1' };
      mockQueue.add.mockResolvedValue(mockJob);

      await service.addMessageNotificationJob(jobData, 5000);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-message-notification',
        jobData,
        expect.objectContaining({
          delay: 5000,
        }),
      );
    });

    it('should handle errors when adding message notification job', async () => {
      const jobData = {
        messageId: 'msg-1',
        senderId: 'user-1',
        recipientIds: ['user-2'],
        roomId: 'room-1',
        content: 'Hello!',
        timestamp: new Date(),
      };

      const error = new Error('Queue error');
      mockQueue.add.mockRejectedValue(error);

      await expect(service.addMessageNotificationJob(jobData)).rejects.toThrow(error);
    });
  });

  describe('addEmailNotificationJob', () => {
    it('should add email notification job successfully', async () => {
      const jobData = {
        to: ['test@example.com'],
        subject: 'New Message',
        template: 'message-notification',
        data: { userName: 'John', message: 'Hello!' },
      };

      const mockJob = { id: 'job-2' };
      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.addEmailNotificationJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email-notification',
        jobData,
        {
          delay: 0,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );
      expect(result).toBe(mockJob);
    });
  });

  describe('addPushNotificationJob', () => {
    it('should add push notification job successfully', async () => {
      const jobData = {
        userIds: ['user-1', 'user-2'],
        title: 'New Message',
        body: 'You have a new message!',
        data: { roomId: 'room-1', messageId: 'msg-1' },
      };

      const mockJob = { id: 'job-3' };
      mockQueue.add.mockResolvedValue(mockJob);

      const result = await service.addPushNotificationJob(jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-push-notification',
        jobData,
        {
          delay: 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );
      expect(result).toBe(mockJob);
    });
  });

  describe('getJobStats', () => {
    it('should return job statistics', async () => {
      mockQueue.getWaiting.mockResolvedValue([1, 2, 3]);
      mockQueue.getActive.mockResolvedValue([1, 2]);
      mockQueue.getCompleted.mockResolvedValue([1, 2, 3, 4, 5]);
      mockQueue.getFailed.mockResolvedValue([1]);

      const result = await service.getJobStats();

      expect(result).toEqual({
        waiting: 3,
        active: 2,
        completed: 5,
        failed: 1,
      });
    });

    it('should handle errors when getting job stats', async () => {
      const error = new Error('Queue stats error');
      mockQueue.getWaiting.mockRejectedValue(error);

      await expect(service.getJobStats()).rejects.toThrow(error);
    });
  });

  describe('cleanJobs', () => {
    it('should clean old jobs successfully', async () => {
      mockQueue.clean.mockResolvedValue(undefined);

      await service.cleanJobs();

      expect(mockQueue.clean).toHaveBeenCalledTimes(2);
      expect(mockQueue.clean).toHaveBeenCalledWith(24 * 60 * 60 * 1000, 'completed');
      expect(mockQueue.clean).toHaveBeenCalledWith(7 * 24 * 60 * 60 * 1000, 'failed');
    });

    it('should handle errors when cleaning jobs', async () => {
      const error = new Error('Clean jobs error');
      mockQueue.clean.mockRejectedValue(error);

      await expect(service.cleanJobs()).rejects.toThrow(error);
    });
  });
});
