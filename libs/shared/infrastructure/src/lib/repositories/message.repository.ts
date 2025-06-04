import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Message,
  MessageDocument,
  IMessageRepository,
} from '@chat/shared/domain';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(message: Partial<Message>): Promise<Message> {
    try {
      const createdMessage = new this.messageModel(message);
      return await createdMessage.save();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create message: ${err.message}`);
    }
  }

  async findById(id: string): Promise<Message | null> {
    try {
      return await this.messageModel
        .findById(id)
        .populate('senderId', 'username displayName avatar')
        .populate('replyTo')
        .exec();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to find message by ID: ${err.message}`);
    }
  }

  async findByRoomId(
    roomId: string,
    options?: { limit?: number; skip?: number },
  ): Promise<Message[]> {
    const { limit = 50, skip = 0 } = options || {};
    return this.messageModel
      .find({ roomId, deleted: false })
      .populate('senderId', 'username displayName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async update(id: string, updates: Partial<Message>): Promise<Message | null> {
    try {
      return await this.messageModel
        .findByIdAndUpdate(id, updates, { new: true })
        .populate('senderId', 'username displayName avatar')
        .exec();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update message: ${err.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.messageModel
      .findByIdAndUpdate(id, { deleted: true }, { new: true })
      .exec();
    return !!result;
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.messageModel
      .findByIdAndUpdate(messageId, {
        $addToSet: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
      })
      .exec();
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    return this.messageModel
      .countDocuments({
        roomId,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
        deleted: false,
      })
      .exec();
  }

  async searchMessages(
    roomId: string,
    query: string,
    options?: any,
  ): Promise<Message[]> {
    const { limit = 20, skip = 0 } = options || {};
    return this.messageModel
      .find({
        roomId,
        $text: { $search: query },
        deleted: false,
      })
      .populate('senderId', 'username displayName avatar')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .skip(skip)
      .exec();
  }
}
