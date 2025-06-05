import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            createChatRoom: jest.fn().mockReturnValue({ id: 'room-1', message: 'Room created' }),
            updateChatRoom: jest.fn().mockReturnValue({ message: 'Room updated' }),
            deleteChatRoom: jest.fn().mockReturnValue({ message: 'Room deleted' }),
            addParticipant: jest.fn().mockReturnValue({ message: 'Participant added' }),
            removeParticipant: jest.fn().mockReturnValue({ message: 'Participant removed' }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });

    it('should create chat room', () => {
      const createDto = { name: 'Test Room' };
      const result = appController.createChatRoom(createDto);
      expect(result).toEqual({ id: 'room-1', message: 'Room created' });
      expect(appService.createChatRoom).toHaveBeenCalledWith(createDto);
    });

    it('should update chat room', () => {
      const updateDto = { name: 'Updated Room' };
      const result = appController.updateChatRoom('room-1', updateDto);
      expect(result).toEqual({ message: 'Room updated' });
      expect(appService.updateChatRoom).toHaveBeenCalledWith('room-1', updateDto);
    });

    it('should delete chat room', () => {
      const result = appController.deleteChatRoom('room-1');
      expect(result).toEqual({ message: 'Room deleted' });
      expect(appService.deleteChatRoom).toHaveBeenCalledWith('room-1');
    });

    it('should add participant', () => {
      const addDto = { userId: 'user-1' };
      const result = appController.addParticipantToChatRoom('room-1', addDto);
      expect(result).toEqual({ message: 'Participant added' });
      expect(appService.addParticipant).toHaveBeenCalledWith('room-1', addDto);
    });

    it('should remove participant', () => {
      const result = appController.removeParticipantFromChatRoom('room-1', 'user-1');
      expect(result).toEqual({ message: 'Participant removed' });
      expect(appService.removeParticipant).toHaveBeenCalledWith('room-1', 'user-1');
    });
  });
});
