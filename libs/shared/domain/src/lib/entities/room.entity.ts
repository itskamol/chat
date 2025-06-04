import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum RoomType {
  DIRECT = 'direct',
  GROUP = 'group',
  CHANNEL = 'channel'
}

export enum RoomMemberRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

export type RoomDocument = Room & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class Room {
  @ApiProperty({ description: 'Room unique identifier' })
  _id?: string;

  @ApiProperty({ description: 'Room name' })
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string = '';

  @ApiProperty({ description: 'Room description' })
  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @ApiProperty({ description: 'Room type' })
  @Prop({ 
    required: true, 
    enum: Object.values(RoomType), 
    default: RoomType.GROUP 
  })
  type: RoomType = RoomType.GROUP;

  @ApiProperty({ description: 'Room privacy setting' })
  @Prop({ default: false })
  isPrivate: boolean = false;

  @ApiProperty({ description: 'Room creator' })
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: string = '';

  @ApiProperty({ description: 'Room members' })
  @Prop({ 
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      role: { type: String, enum: Object.values(RoomMemberRole), default: RoomMemberRole.MEMBER },
      joinedAt: { type: Date, default: Date.now },
      lastSeen: { type: Date, default: Date.now }
    }],
    default: []
  })
  members: Array<{
    userId: string;
    role: RoomMemberRole;
    joinedAt: Date;
    lastSeen: Date;
  }> = [];

  @ApiProperty({ description: 'Room avatar URL' })
  @Prop({ default: null })
  avatar?: string | null = null;

  @ApiProperty({ description: 'Last message in room' })
  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage?: string | null = null;

  @ApiProperty({ description: 'Last activity timestamp' })
  @Prop({ default: Date.now })
  lastActivity: Date = new Date();

  @ApiProperty({ description: 'Room settings' })
  @Prop({ type: Object, default: {} })
  settings: Record<string, any> = {};

  @ApiProperty({ description: 'Room creation date' })
  createdAt?: Date;

  @ApiProperty({ description: 'Room last update date' })
  updatedAt?: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Indexes
RoomSchema.index({ type: 1 });
RoomSchema.index({ isPrivate: 1 });
RoomSchema.index({ createdBy: 1 });
RoomSchema.index({ 'members.userId': 1 });
RoomSchema.index({ lastActivity: -1 });
RoomSchema.index({ name: 'text', description: 'text' });
