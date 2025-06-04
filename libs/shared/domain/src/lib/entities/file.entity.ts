import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FileDocument = FileEntity & Document;

@Schema({ timestamps: true })
export class FileEntity {
  @ApiProperty({ description: 'File unique identifier' })
  _id?: string;

  @ApiProperty({ description: 'Original filename' })
  @Prop({ required: true, trim: true })
  originalName!: string;

  @ApiProperty({ description: 'Stored filename' })
  @Prop({ required: true, unique: true })
  fileName: string = '';

  @ApiProperty({ description: 'File MIME type' })
  @Prop({ required: true })
  mimeType: string = '';

  @ApiProperty({ description: 'File size in bytes' })
  @Prop({ required: true })
  size: number = 0;

  @ApiProperty({ description: 'File URL' })
  @Prop({ required: true })
  url: string = '';

  @ApiProperty({ description: 'Thumbnail URL for images' })
  @Prop({ default: null })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'User who uploaded the file' })
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  uploadedBy: string = '';

  @ApiProperty({ description: 'Room where file was shared' })
  @Prop({ type: Types.ObjectId, ref: 'Room', default: null })
  roomId?: string;

  @ApiProperty({ description: 'File metadata' })
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any> = {};

  @ApiProperty({ description: 'File processing status' })
  @Prop({ 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'completed' 
  })
  status: string = 'completed';

  @ApiProperty({ description: 'File download count' })
  @Prop({ default: 0 })
  downloadCount: number = 0;

  @ApiProperty({ description: 'File creation date' })
  createdAt?: Date;

  @ApiProperty({ description: 'File last update date' })
  updatedAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(FileEntity);

// Indexes
FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ roomId: 1 });
FileSchema.index({ mimeType: 1 });
FileSchema.index({ status: 1 });
FileSchema.index({ createdAt: -1 });
