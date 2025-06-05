import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ChatGateway } from '../websocket/chat.gateway';

export interface MessageCreatedEvent {
  messageId: string;
  content: string;
  senderId: string;
  roomId: string;
  timestamp: Date;
  type: string;
  metadata?: any;
}

export interface MessageReadEvent {
  messageId: string;
  userId: string;
  roomId: string;
  timestamp: Date;
}

export interface UserTypingEvent {
  userId: string;
  roomId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface UserJoinedRoomEvent {
  userId: string;
  roomId: string;
  timestamp: Date;
}

export interface UserLeftRoomEvent {
  userId: string;
  roomId: string;
  timestamp: Date;
}

export interface RoomCreatedEvent {
  roomId: string;
  name: string;
  createdBy: string;
  type: string;
  timestamp: Date;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly chatGateway: ChatGateway,
  ) {}

  // Emit events
  emitMessageCreated(event: MessageCreatedEvent) {
    this.logger.log(`Emitting message created event for room ${event.roomId}`);
    this.eventEmitter.emit('message.created', event);
  }

  emitMessageRead(event: MessageReadEvent) {
    this.logger.log(`Emitting message read event for message ${event.messageId}`);
    this.eventEmitter.emit('message.read', event);
  }

  emitUserTyping(event: UserTypingEvent) {
    this.eventEmitter.emit('user.typing', event);
  }

  emitUserJoinedRoom(event: UserJoinedRoomEvent) {
    this.logger.log(`Emitting user joined room event: ${event.userId} -> ${event.roomId}`);
    this.eventEmitter.emit('user.joined.room', event);
  }

  emitUserLeftRoom(event: UserLeftRoomEvent) {
    this.logger.log(`Emitting user left room event: ${event.userId} -> ${event.roomId}`);
    this.eventEmitter.emit('user.left.room', event);
  }

  emitRoomCreated(event: RoomCreatedEvent) {
    this.logger.log(`Emitting room created event: ${event.roomId}`);
    this.eventEmitter.emit('room.created', event);
  }

  // Event listeners
  @OnEvent('message.created')
  async handleMessageCreated(event: MessageCreatedEvent) {
    // Broadcast to WebSocket clients
    this.chatGateway.sendToRoom(event.roomId, 'newMessage', {
      id: event.messageId,
      content: event.content,
      senderId: event.senderId,
      roomId: event.roomId,
      type: event.type,
      timestamp: event.timestamp,
      metadata: event.metadata,
    });

    // TODO: Publish to message queue for other services
    // await this.publishToQueue('message.created', event);
  }

  @OnEvent('message.read')
  async handleMessageRead(event: MessageReadEvent) {
    // Broadcast to WebSocket clients
    this.chatGateway.sendToRoom(event.roomId, 'messageRead', {
      messageId: event.messageId,
      userId: event.userId,
      timestamp: event.timestamp,
    });

    // TODO: Publish to message queue
    // await this.publishToQueue('message.read', event);
  }

  @OnEvent('user.typing')
  async handleUserTyping(event: UserTypingEvent) {
    // Broadcast to WebSocket clients (no persistence needed)
    this.chatGateway.sendToRoom(event.roomId, 'userTyping', {
      userId: event.userId,
      roomId: event.roomId,
      isTyping: event.isTyping,
      timestamp: event.timestamp,
    });
  }

  @OnEvent('user.joined.room')
  async handleUserJoinedRoom(event: UserJoinedRoomEvent) {
    // Broadcast to WebSocket clients
    this.chatGateway.sendToRoom(event.roomId, 'userJoinedRoom', {
      userId: event.userId,
      roomId: event.roomId,
      timestamp: event.timestamp,
    });

    // TODO: Publish to message queue
    // await this.publishToQueue('user.joined.room', event);
  }

  @OnEvent('user.left.room')
  async handleUserLeftRoom(event: UserLeftRoomEvent) {
    // Broadcast to WebSocket clients
    this.chatGateway.sendToRoom(event.roomId, 'userLeftRoom', {
      userId: event.userId,
      roomId: event.roomId,
      timestamp: event.timestamp,
    });

    // TODO: Publish to message queue
    // await this.publishToQueue('user.left.room', event);
  }

  @OnEvent('room.created')
  async handleRoomCreated(event: RoomCreatedEvent) {
    this.logger.log(`Room created: ${event.roomId} by ${event.createdBy}`);
    
    // TODO: Publish to message queue
    // await this.publishToQueue('room.created', event);
  }

  // TODO: Implement message queue publishing
  // private async publishToQueue(pattern: string, data: any) {
  //   try {
  //     // Implementation depends on chosen message queue (RabbitMQ, Redis, etc.)
  //     this.logger.log(`Publishing to queue: ${pattern}`);
  //   } catch (error) {
  //     this.logger.error(`Failed to publish to queue: ${pattern}`, error);
  //   }
  // }
}
