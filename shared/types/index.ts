import { Document } from 'mongoose';

// Socket Events
export interface ServerToClientEvents {
    error: (data: { message: string }) => void;
    authenticated: (data: { userId: string; username: string }) => void;
    onlineUsers: (users: Array<{ userId: string; username: string }>) => void;
    userTyping: (data: {
        userId: string;
        username: string;
        isTyping: boolean;
    }) => void;
    messageReceived: (message: SocketMessage) => void;
    messageRead: (messageId: string) => void;
}

export interface ClientToServerEvents {
    sendMessage: (data: {
        receiverId: string;
        message: string;
        messageType: MessageType;
    }) => void;
    getMessages: (data: {
        receiverId: string;
        page?: number;
        limit?: number;
    }) => void;
    markMessageAsRead: (data: { messageId: string }) => void;
    typing: (data: { receiverId: string; isTyping: boolean }) => void;
    getOnlineUsers: () => void;
}

export enum MessageStatus {
    NotDelivered = 'NotDelivered',
    Delivered = 'Delivered',
    Seen = 'Seen',
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface BaseMessage {
    senderId: string;
    receiverId: string;
    message: string;
    messageType: MessageType;
    status: MessageStatus;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
    originalMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Database model interface
export interface IMessage extends BaseMessage, Document {
    storedFileName?: string; // Internal storage name, backend only
}

// Frontend message interface
export interface Message extends BaseMessage {
    _id?: string;
    senderName?: string;
    uploadProgress?: number; // Frontend only
}

// Socket message interface
export interface SocketMessage {
    id: string;
    senderId: string;
    receiverId: string;
    message: string;
    messageType: MessageType;
    status: MessageStatus;
    createdAt: Date;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
}

export interface FileUploadResponse {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileMimeType: string;
}

export interface User {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Message types
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// Chat Room types
export interface ChatRoom {
  _id?: string;
  id?: string;
  name?: string;
  participants: string[];
  isGroup: boolean;
  lastMessage?: Message;
  createdAt?: Date;
  updatedAt?: Date;
}

// File Attachment types
export interface FileAttachment {
  _id?: string;
  id?: string;
  messageId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt?: Date;
}

// Re-export socket types
export * from './socket';
