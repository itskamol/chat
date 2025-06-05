import { Injectable } from '@nestjs/common';

// Generated types based on chat.proto
export interface GetRoomDetailsRequest {
  roomId: string;
}

export interface GetRoomDetailsResponse {
  room: Room | undefined;
}

export interface GetRoomMembersRequest {
  roomId: string;
  page?: number;
  limit?: number;
}

export interface GetRoomMembersResponse {
  members: RoomMember[];
  total: number;
}

export interface GetUserRoomsRequest {
  userId: string;
  page?: number;
  limit?: number;
}

export interface GetUserRoomsResponse {
  rooms: Room[];
  total: number;
}

export interface SaveMessageRequest {
  message: Message | undefined;
}

export interface SaveMessageResponse {
  success: boolean;
  messageId: string;
}

export interface GetMessagesRequest {
  roomId: string;
  page?: number;
  limit?: number;
  before?: string; // timestamp
}

export interface GetMessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  lastMessage?: Message;
  isPrivate: boolean;
  avatar?: string;
}

export interface RoomMember {
  userId: string;
  roomId: string;
  role: MemberRole;
  joinedAt: string;
  lastSeenAt?: string;
  nickname?: string;
  permissions: string[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  replyToId?: string;
  attachments: Attachment[];
  reactions: Reaction[];
  mentions: string[];
  isDeleted: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export enum RoomType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL',
  BROADCAST = 'BROADCAST',
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SYSTEM = 'SYSTEM',
  EMOJI = 'EMOJI',
}

// gRPC service interface
export interface ChatServiceInterface {
  getRoomDetails(request: GetRoomDetailsRequest): Promise<GetRoomDetailsResponse>;
  getRoomMembers(request: GetRoomMembersRequest): Promise<GetRoomMembersResponse>;
  getUserRooms(request: GetUserRoomsRequest): Promise<GetUserRoomsResponse>;
  saveMessage(request: SaveMessageRequest): Promise<SaveMessageResponse>;
  getMessages(request: GetMessagesRequest): Promise<GetMessagesResponse>;
}
