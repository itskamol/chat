import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Room, RoomDocument, IRoomRepository } from '@chat/shared/domain';

@Injectable()
export class RoomRepository implements IRoomRepository {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>
  ) { }
  async findByUserId(userId: string): Promise<Room[]> {
    return this.roomModel.find({ 'members.userId': userId }).exec();
  }

  async addMember(roomId: string, userId: string, role = 'member'): Promise<void> {
    await this.roomModel.updateOne(
      { _id: roomId },
      { $addToSet: { members: { userId, role } } }
    ).exec();
  }
  async removeMember(roomId: string, userId: string): Promise<void> {
    await this.roomModel.updateOne(
      { _id: roomId },
      { $pull: { members: { userId } } }
    ).exec();
  }

  async updateMemberRole(roomId: string, userId: string, role: string): Promise<void> {
    await this.roomModel.updateOne(
      { _id: roomId, 'members.userId': userId },
      { $set: { 'members.$.role': role } }
    ).exec();
  }

  async isUserMember(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomModel.findOne(
      { _id: roomId, 'members.userId': userId },
      { _id: 1 }
    ).exec();
    return !!room;
  }

  async updateLastActivity(roomId: string): Promise<void> {
    await this.roomModel.updateOne(
      { _id: roomId },
      { $set: { lastActivity: new Date() } }
    ).exec();
  }

  async create(room: Partial<Room>): Promise<Room> {
    const createdRoom = new this.roomModel(room);
    return createdRoom.save();
  }

  async findById(id: string): Promise<Room | null> {
    return this.roomModel.findById(id).exec();
  }

  async update(id: string, updates: Partial<Room>): Promise<Room | null> {
    return this.roomModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.roomModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findMany(
    filter: FilterQuery<Room>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<Room[]> {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options || {};
    return this.roomModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }
}
