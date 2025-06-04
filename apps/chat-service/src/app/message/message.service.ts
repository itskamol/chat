import { Injectable, Inject } from '@nestjs/common';
import { IMessageRepository, IRoomRepository } from '@chat/shared/domain';
import { CreateMessageDto, UpdateMessageDto } from './dto';

@Injectable()
export class MessageService {
  constructor(
    @Inject('IMessageRepository') private messageRepository: IMessageRepository,
    @Inject('IRoomRepository') private roomRepository: IRoomRepository,
  ) {}

  async createMessage(createMessageDto: CreateMessageDto) {
    try {
      const message = await this.messageRepository.create(createMessageDto);
      
      // Update room's last activity
      if (createMessageDto.roomId) {
        await this.roomRepository.updateLastActivity(createMessageDto.roomId);
      }
      
      return {
        success: true,
        data: message,
        message: 'Message created successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async getMessagesByRoom(roomId: string, options?: { limit?: number; skip?: number }) {
    try {
      const messages = await this.messageRepository.findByRoomId(roomId, options);
      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async updateMessage(id: string, updateMessageDto: UpdateMessageDto) {
    try {
      const message = await this.messageRepository.update(id, updateMessageDto);
      return {
        success: true,
        data: message,
        message: 'Message updated successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async deleteMessage(id: string) {
    try {
      const result = await this.messageRepository.delete(id);
      return {
        success: result,
        message: result ? 'Message deleted successfully' : 'Failed to delete message',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async markAsRead(messageId: string, userId: string) {
    try {
      // This would typically update the message's readBy array
      const message = await this.messageRepository.update(messageId, {
        readBy: [{ userId, readAt: new Date() }],
      });
      
      return {
        success: true,
        data: message,
        message: 'Message marked as read',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
