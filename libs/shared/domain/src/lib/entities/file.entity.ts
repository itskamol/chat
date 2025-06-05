import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type FileDocument = FileEntity & Document;

@Schema({ timestamps: true })
export class FileEntity {
  @ApiProperty({ description: 'File unique identifier' })
  _id?: string;

  @ApiProperty({ description: 'Original filename' })
  @Prop({ type: String, required: true, trim: true })
  originalName!: string;

  @ApiProperty({ description: 'Stored filename' })
  @Prop({ type: String, required: true, unique: true })
  fileName = '';

  @ApiProperty({ description: 'File MIME type' })
  @Prop({ type: String, required: true })
  mimeType = '';

  @ApiProperty({ description: 'File size in bytes' })
  @Prop({ type: Number, required: true })
  size = 0;

  @ApiProperty({ description: 'File URL' })
  @Prop({ type: String, required: true })
  url = '';

  @ApiProperty({ description: 'Thumbnail URL for images' })
  @Prop({ type: String, default: null })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'User who uploaded the file' })
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  uploadedBy = '';

  @ApiProperty({ description: 'Room where file was shared' })
  @Prop({ type: Types.ObjectId, ref: 'Room', default: null })
  roomId?: string;

  @ApiProperty({ description: 'File metadata' })
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any> = {};

  @ApiProperty({ description: 'File processing status' })
  @Prop({ 
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'completed' 
  })
  status = 'completed';

  @ApiProperty({ description: 'File download count' })
  @Prop({ type: Number, default: 0 })
  downloadCount = 0;

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
