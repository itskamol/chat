import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@chat/shared/domain';

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Message type', enum: MessageType })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ description: 'Sender ID' })
  @IsString()
  senderId: string;

  @ApiProperty({ description: 'Room ID' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Reply to message ID', required: false })
  @IsString()
  @IsOptional()
  replyTo?: string;

  @ApiProperty({ description: 'Message metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateMessageDto {
  @ApiProperty({ description: 'Message content', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Message type', enum: MessageType, required: false })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ description: 'Message metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Read by users', required: false })
  @IsArray()
  @IsOptional()
  readBy?: Array<{ userId: string; readAt: Date }>;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'User ID who read the message' })
  @IsString()
  userId: string;
}
