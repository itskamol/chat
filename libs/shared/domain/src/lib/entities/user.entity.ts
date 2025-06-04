import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export type UserDocument = User & Document;

@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class User {
  @ApiProperty({ description: 'User unique identifier' })
  _id?: string;

  @ApiProperty({ description: 'User username' })
  @Prop({ 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 3, 
    maxlength: 30,
    index: true 
  })
  username!: string;

  @ApiProperty({ description: 'Unique email address of the user' })
  @Prop({ 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true,
    index: true 
  })
  email!: string;

  @Prop({ 
    required: true, 
    select: false,
    minlength: 8 
  })
  password!: string;

  @ApiProperty({ description: 'User display name' })
  @Prop({ 
    required: true, 
    trim: true, 
    maxlength: 50 
  })
  displayName!: string;

  @ApiProperty({ description: 'User avatar URL' })
  @Prop({ default: null })
  avatar?: string;

  @ApiProperty({ description: 'User online status' })
  @Prop({ default: false })
  isOnline: boolean = false;

  @ApiProperty({ description: 'Last seen timestamp (nullable)' })
  @Prop({ type: Date, default: null })
  lastSeen?: Date;

  @ApiProperty({ description: 'User preferences as key-value pairs' })
  @Prop({ type: Object, default: {} })
  preferences: Record<string, any> = {};

  @ApiProperty({ description: 'User roles' })
  @Prop({ 
    type: [String], 
    enum: Object.values(UserRole),
    default: [UserRole.USER] 
  })
  roles: UserRole[] = [UserRole.USER];

  @ApiProperty({ description: 'Current account status' })
  @Prop({ 
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE 
  })
  status: UserStatus = UserStatus.ACTIVE;

  @ApiProperty({ description: 'Account creation date' })
  createdAt?: Date;

  @ApiProperty({ description: 'Account last update date' })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
