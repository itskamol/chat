import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User, UserDocument, IUserRepository } from '@chat/shared/domain';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) { }

  async create(user: Partial<User>): Promise<User> {
    try {
      const createdUser = new this.userModel(user);
      return await createdUser.save();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create user: ${err.message}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.userModel.findById(id).exec();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to find user by ID: ${err.message}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, updates, { new: true })
        .exec();
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update user: ${err.message}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findMany(
    filter: FilterQuery<User>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<User[]> {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options || {};
    return this.userModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }

  async count(filter: FilterQuery<User>): Promise<number> {
    return this.userModel.countDocuments(filter).exec();
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      isOnline,
      lastSeen: new Date(),
    }).exec();
  }

  async findOnlineUsers(): Promise<User[]> {
    return this.userModel.find({ isOnline: true }).exec();
  }
}
