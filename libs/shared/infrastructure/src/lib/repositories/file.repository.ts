import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { FileEntity, FileDocument, IFileRepository } from '@chat/shared/domain';

@Injectable()
export class FileRepository implements IFileRepository {
  constructor(
    @InjectModel(FileEntity.name) private fileModel: Model<FileDocument>
  ) {}
    async findByUserId(userId: string, options?: { limit?: number; skip?: number; sort?: any }): Promise<FileEntity[]> {
        const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options || {};
        return this.fileModel
            .find({ userId })
            .limit(limit)
            .skip(skip)
            .sort(sort)
            .exec();
    }

    async findByRoomId(roomId: string, options?: { limit?: number; skip?: number; sort?: any }): Promise<FileEntity[]> {
        const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options || {};
        return this.fileModel
            .find({ roomId })
            .limit(limit)
            .skip(skip)
            .sort(sort)
            .exec();
    }
    incrementDownloadCount(id: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

  async create(file: Partial<FileEntity>): Promise<FileEntity> {
    const createdFile = new this.fileModel(file);
    return createdFile.save();
  }

  async findById(id: string): Promise<FileEntity | null> {
    return this.fileModel.findById(id).exec();
  }

  async update(id: string, updates: Partial<FileEntity>): Promise<FileEntity | null> {
    return this.fileModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.fileModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findMany(
    filter: FilterQuery<FileEntity>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<FileEntity[]> {
    const { limit = 10, skip = 0, sort = { createdAt: -1 } } = options || {};
    return this.fileModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }
}
