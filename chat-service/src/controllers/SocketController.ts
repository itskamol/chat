import { Server as SocketIOServer } from 'socket.io';
import { SocketService } from '../services/SocketService';
import { logger } from '../utils';
import { AuthenticatedSocket } from '@chat/shared';

export class SocketController {
    constructor(
        private io: SocketIOServer,
        private socketService: SocketService
    ) {}

    public handleConnection(socket: AuthenticatedSocket, userId: string): void {
        try {
            // Store user's socket and update online status
            this.socketService.setUserSocket(socket, userId);
            
            // Notify others that user is online
            this.socketService.notifyUserStatusChanged(userId, 'online', new Date());

            socket.emit('onlineUsers', this.socketService.getOnlineUsers());

            logger.info(`User ${userId} connected`, { socketId: socket.id });
        } catch (error) {
            logger.error(`Error in handleConnection for user ${userId}:`, error);
        }
    }

    public handleDisconnect(socket: AuthenticatedSocket): void {
        try {
            const userId = this.socketService.getUserId(socket);
            if (userId) {
                // Update online status and notify others
                this.socketService.notifyUserStatusChanged(userId, 'offline', new Date());
                this.socketService.removeUserSocket(socket);

                logger.info(`User ${userId} disconnected`, { socketId: socket.id });
            }
        } catch (error) {
            logger.error(`Error in handleDisconnect for socket ${socket.id}:`, error);
        }
    }

    public handleGetOnlineUsers(socket: AuthenticatedSocket): void {
        try {
            this.socketService.notifyOnlineUsers(socket);
        } catch (error) {
            logger.error(`Error in handleGetOnlineUsers for socket ${socket.id}:`, error);
        }
    }

    public handleTyping(socket: AuthenticatedSocket, data: { senderId: string; receiverId: string; isTyping: boolean }): void {
        try {
            this.socketService.forwardTypingStatus(data.senderId, data.receiverId, data.isTyping);
        } catch (error) {
            logger.error(`Error in handleTyping for socket ${socket.id}:`, error);
        }
    }
}
