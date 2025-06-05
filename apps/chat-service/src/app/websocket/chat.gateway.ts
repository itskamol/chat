import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageService } from '../message/message.service';
import { RoomService } from '../room/room.service';
import { WebSocketAuthService } from './websocket-auth.service';
import { CreateMessageDto } from '../message/dto';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRooms?: string[];
    user?: any;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/chat',
})
@UsePipes(new ValidationPipe())
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);
    private connectedUsers = new Map<string, AuthenticatedSocket>();

    constructor(
        private readonly messageService: MessageService,
        private readonly roomService: RoomService,
        private readonly webSocketAuthService: WebSocketAuthService,
    ) { }

    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Authenticate the client using token from handshake
            const user = await this.webSocketAuthService.authenticateSocket(client);
            if (user) {
                client.userId = user.id;
                client.user = user;
                this.connectedUsers.set(user.id, client);
                this.logger.log(`Client connected and authenticated: ${client.id} (User: ${user.id})`);

                // Get user's rooms and join them
                const userRoomsResult = await this.roomService.getUserRooms(user.id);
                if (userRoomsResult.success && userRoomsResult.data) {
                    const rooms = Array.isArray(userRoomsResult.data) ? userRoomsResult.data : [userRoomsResult.data];
                    client.userRooms = rooms.map(room => room.id);

                    // Join all user rooms
                    client.userRooms.forEach(roomId => {
                        client.join(roomId);
                    });
                }
            } else {
                this.logger.log(`Client connected without authentication: ${client.id}`);
            }
        } catch (error) {
            this.logger.error('Connection authentication failed:', error);
            // Don't disconnect, allow manual authentication
        }
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        if (client.userId) {
            this.connectedUsers.delete(client.userId);

            // Leave all rooms
            if (client.userRooms) {
                client.userRooms.forEach(roomId => {
                    client.leave(roomId);
                    // Notify room members that user left
                    client.to(roomId).emit('userDisconnected', {
                        userId: client.userId,
                        timestamp: new Date(),
                    });
                });
            }
        }
    }

    @SubscribeMessage('authenticate')
    async handleAuthenticate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { token: string },
    ) {
        try {
            const user = await this.webSocketAuthService.validateToken(data.token);
            if (!user) {
                client.emit('authenticated', { success: false, error: 'Invalid token' });
                return;
            }

            client.userId = user.id;
            client.user = user;
            this.connectedUsers.set(user.id, client);

            // Get user's rooms and join them
            const userRoomsResult = await this.roomService.getUserRooms(user.id);
            if (userRoomsResult.success && userRoomsResult.data) {
                const rooms = Array.isArray(userRoomsResult.data) ? userRoomsResult.data : [userRoomsResult.data];
                client.userRooms = rooms.map(room => room.id);

                // Join all user rooms
                client.userRooms.forEach(roomId => {
                    client.join(roomId);
                });
            }

            client.emit('authenticated', { success: true, user: { id: user.id, email: user.email } });
            this.logger.log(`User ${user.id} authenticated via message and joined rooms`);
        } catch (error) {
            this.logger.error('Authentication failed:', error);
            client.emit('authenticated', { success: false, error: 'Authentication failed' });
        }
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { roomId: string },
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        try {
            // Verify user has access to the room
            const roomResult = await this.roomService.getRoomById(data.roomId);
            if (!roomResult.success) {
                client.emit('error', { message: 'Room not found' });
                return;
            }

            client.join(data.roomId);
            client.userRooms = client.userRooms || [];
            if (!client.userRooms.includes(data.roomId)) {
                client.userRooms.push(data.roomId);
            }

            // Notify room members
            client.to(data.roomId).emit('userJoinedRoom', {
                userId: client.userId,
                roomId: data.roomId,
                timestamp: new Date(),
            });

            client.emit('joinedRoom', { roomId: data.roomId });
            this.logger.log(`User ${client.userId} joined room ${data.roomId}`);
        } catch (error) {
            this.logger.error('Failed to join room:', error);
            client.emit('error', { message: 'Failed to join room' });
        }
    }

    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { roomId: string },
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        client.leave(data.roomId);
        client.userRooms = client.userRooms?.filter(roomId => roomId !== data.roomId) || [];

        // Notify room members
        client.to(data.roomId).emit('userLeftRoom', {
            userId: client.userId,
            roomId: data.roomId,
            timestamp: new Date(),
        });

        client.emit('leftRoom', { roomId: data.roomId });
        this.logger.log(`User ${client.userId} left room ${data.roomId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() createMessageDto: CreateMessageDto,
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        try {
            // Ensure sender ID matches authenticated user
            createMessageDto.senderId = client.userId;

            // Save message to database
            const messageResult = await this.messageService.createMessage(createMessageDto);

            if (!messageResult.success) {
                client.emit('error', { message: 'Failed to send message' });
                return;
            }

            // Broadcast message to all room members
            this.server.to(createMessageDto.roomId).emit('newMessage', {
                ...messageResult.data,
                timestamp: new Date(),
            });

            this.logger.log(`Message sent from ${client.userId} to room ${createMessageDto.roomId}`);
        } catch (error) {
            this.logger.error('Failed to send message:', error);
            client.emit('error', { message: 'Failed to send message' });
        }
    }

    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { roomId: string; isTyping: boolean },
    ) {
        if (!client.userId) {
            return;
        }

        // Broadcast typing status to room members (except sender)
        client.to(data.roomId).emit('userTyping', {
            userId: client.userId,
            roomId: data.roomId,
            isTyping: data.isTyping,
            timestamp: new Date(),
        });
    }

    @SubscribeMessage('markMessageRead')
    async handleMarkMessageRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { messageId: string; roomId: string },
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        try {
            const result = await this.messageService.markAsRead(data.messageId, client.userId);

            if (result.success) {
                // Broadcast read receipt to room members
                this.server.to(data.roomId).emit('messageRead', {
                    messageId: data.messageId,
                    userId: client.userId,
                    timestamp: new Date(),
                });
            }
        } catch (error) {
            this.logger.error('Failed to mark message as read:', error);
        }
    }

    // Helper method to send message to specific user
    sendToUser(userId: string, event: string, data: any) {
        const userSocket = this.connectedUsers.get(userId);
        if (userSocket) {
            userSocket.emit(event, data);
        }
    }

    // Helper method to send message to all users in a room
    sendToRoom(roomId: string, event: string, data: any) {
        this.server.to(roomId).emit(event, data);
    }

    // Helper method to get connected users count
    getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    // Helper method to get users in a room
    async getRoomUsers(roomId: string): Promise<string[]> {
        const roomSockets = await this.server.in(roomId).fetchSockets();
        return roomSockets
            .map(socket => (socket as any).userId)
            .filter(userId => userId !== undefined) as string[];
    }
}
