import { Test } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createChatRoom', () => {
    it('should create a chat room', async () => {
      const createDto = { name: 'Test Room', type: 'GROUP' };
      const result = await service.createChatRoom(createDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('placeholder');
    });
  });

  describe('updateChatRoom', () => {
    it('should update a chat room', async () => {
      const updateDto = { name: 'Updated Room' };
      const result = await service.updateChatRoom('room-1', updateDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('placeholder');
    });
  });

  describe('deleteChatRoom', () => {
    it('should delete a chat room', async () => {
      const result = await service.deleteChatRoom('room-1');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('placeholder');
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to a room', async () => {
      const addDto = { userId: 'user-1' };
      const result = await service.addParticipant('room-1', addDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('placeholder');
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant from a room', async () => {
      const result = await service.removeParticipant('room-1', 'user-1');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('placeholder');
    });
  });
});
