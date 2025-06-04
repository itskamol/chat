import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system'
}

export type MessageDocument = Message & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class Message {
  @ApiProperty({ description: 'Message unique identifier' })
  _id?: string;

  @ApiProperty({ description: 'Message content' })
  @Prop({ required: true, trim: true, maxlength: 4000 })
  content: string = '';

  @ApiProperty({ description: 'Room ID where message was sent' })
  @Prop({ required: true, type: Types.ObjectId, ref: 'Room' })
  roomId: string = '';

  @ApiProperty({ description: 'User ID who sent the message' })
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: string = '';

  @ApiProperty({ description: 'Message type' })
  @Prop({ 
    required: true, 
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT
  })
  type: MessageType = MessageType.TEXT;

  @ApiProperty({ description: 'Message metadata (file info, etc.)' })
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any> = {};

  @ApiProperty({ description: 'Message reply to another message' })
  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  replyTo?: string;

  @ApiProperty({ description: 'Users who read this message' })
  @Prop({ 
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now }
    }],
    default: []
  })
  readBy: Array<{ userId: string; readAt: Date }> = [];

  @ApiProperty({ description: 'Message edited status' })
  @Prop({ default: false })
  edited: boolean = false;

  @ApiProperty({ description: 'Message last edit time' })
  @Prop({ default: null })
  editedAt?: Date;

  @ApiProperty({ description: 'Message deleted status' })
  @Prop({ default: false })
  deleted: boolean = false;

  @ApiProperty({ description: 'Message creation date' })
  createdAt?: Date;

  @ApiProperty({ description: 'Message last update date' })
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for better performance
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ deleted: 1 });
MessageSchema.index({ 'readBy.userId': 1 });
