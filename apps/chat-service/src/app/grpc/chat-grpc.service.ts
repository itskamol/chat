import { Injectable } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { MessageService } from '../message/message.service';
import { RoomService } from '../room/room.service';

// gRPC interfaces (these would typically be generated from .proto files)
interface GetRoomDetailsRequest {
  roomId: string;
}

interface GetRoomDetailsResponse {
  id: string;
  name: string;
  description?: string;
  type: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    lastSeen: string;
  }>;
}

interface GetRoomMembersRequest {
  roomId: string;
}

interface GetRoomMembersResponse {
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
    lastSeen: string;
  }>;
}

interface GetUserRoomsRequest {
  userId: string;
}

interface GetUserRoomsResponse {
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    lastActivity: string;
    unreadCount: number;
  }>;
}

interface SaveMessageRequest {
  content: string;
  type: string;
  senderId: string;
  roomId: string;
  replyTo?: string;
  metadata?: any;
}

interface SaveMessageResponse {
  id: string;
  content: string;
  type: string;
  senderId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  replyTo?: string;
  metadata?: any;
}

interface GetMessagesRequest {
  roomId: string;
  limit?: number;
  skip?: number;
  before?: string;
  after?: string;
}

interface GetMessagesResponse {
  messages: Array<{
    id: string;
    content: string;
    type: string;
    senderId: string;
    roomId: string;
    createdAt: string;
    updatedAt: string;
    replyTo?: string;
    metadata?: any;
    readBy: Array<{
      userId: string;
      readAt: string;
    }>;
  }>;
  total: number;
  hasMore: boolean;
}

@Injectable()
export class ChatGrpcService {
  constructor(
    private readonly messageService: MessageService,
    private readonly roomService: RoomService,
  ) {}

  @GrpcMethod('ChatService', 'GetRoomDetails')
  async getRoomDetails(data: GetRoomDetailsRequest): Promise<GetRoomDetailsResponse> {
    const result = await this.roomService.getRoomById(data.roomId);
    
    if (!result.success || !result.data) {
      throw new Error('Room not found');
    }

    const room = result.data;
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      isPrivate: room.isPrivate || false,
      createdBy: room.createdBy,
      createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: room.updatedAt?.toISOString() || new Date().toISOString(),
      members: room.members?.map(member => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt?.toISOString() || new Date().toISOString(),
        lastSeen: member.lastSeen?.toISOString() || new Date().toISOString(),
      })) || [],
    };
  }

  @GrpcMethod('ChatService', 'GetRoomMembers')
  async getRoomMembers(data: GetRoomMembersRequest): Promise<GetRoomMembersResponse> {
    const result = await this.roomService.getRoomById(data.roomId);
    
    if (!result.success || !result.data) {
      throw new Error('Room not found');
    }

    return {
      members: result.data.members?.map(member => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt?.toISOString() || new Date().toISOString(),
        lastSeen: member.lastSeen?.toISOString() || new Date().toISOString(),
      })) || [],
    };
  }

  @GrpcMethod('ChatService', 'GetUserRooms')
  async getUserRooms(data: GetUserRoomsRequest): Promise<GetUserRoomsResponse> {
    const result = await this.roomService.getUserRooms(data.userId);
    
    if (!result.success) {
      throw new Error('Failed to get user rooms');
    }

    const rooms = Array.isArray(result.data) ? result.data : [result.data];
    
    return {
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        lastActivity: room.lastActivity?.toISOString() || new Date().toISOString(),
        unreadCount: 0, // TODO: Implement unread count logic
      })),
    };
  }

  @GrpcMethod('ChatService', 'SaveMessage')
  async saveMessage(data: SaveMessageRequest): Promise<SaveMessageResponse> {
    const createMessageDto = {
      content: data.content,
      type: data.type as any,
      senderId: data.senderId,
      roomId: data.roomId,
      replyTo: data.replyTo,
      metadata: data.metadata,
    };

    const result = await this.messageService.createMessage(createMessageDto);
    
    if (!result.success || !result.data) {
      throw new Error('Failed to save message');
    }

    const message = result.data;
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: message.senderId,
      roomId: message.roomId,
      createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: message.updatedAt?.toISOString() || new Date().toISOString(),
      replyTo: message.replyTo,
      metadata: message.metadata,
    };
  }

  @GrpcMethod('ChatService', 'GetMessages')
  async getMessages(data: GetMessagesRequest): Promise<GetMessagesResponse> {
    const options = {
      limit: data.limit || 50,
      skip: data.skip || 0,
    };

    const result = await this.messageService.getMessagesByRoom(data.roomId, options);
    
    if (!result.success) {
      throw new Error('Failed to get messages');
    }

    const messages = Array.isArray(result.data) ? result.data : [result.data];
    
    return {
      messages: messages.map(message => ({
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.senderId,
        roomId: message.roomId,
        createdAt: message.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: message.updatedAt?.toISOString() || new Date().toISOString(),
        replyTo: message.replyTo,
        metadata: message.metadata,
        readBy: message.readBy?.map(read => ({
          userId: read.userId,
          readAt: read.readAt?.toISOString() || new Date().toISOString(),
        })) || [],
      })),
      total: messages.length,
      hasMore: messages.length === options.limit,
    };
  }
}
