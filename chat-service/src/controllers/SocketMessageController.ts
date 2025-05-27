import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { MessageService } from '../services/MessageService';
import { SocketService } from '../services/SocketService';
import { logger } from '../utils';
import { AuthenticatedSocket } from '@chat/shared';

export class SocketMessageController {
    constructor(
        private io: SocketIOServer,
        private messageService: MessageService,
        private socketService: SocketService
    ) {}

    public async handleSendMessage(socket: AuthenticatedSocket, data: { senderId: string; receiverId: string; message: string, messageType?: string }) {
        try {
            const { senderId, receiverId, message, messageType } = data;

            // Get receiver's socket ID if they're online
            const receiverSocketId = this.socketService.getSocketIdByUserId(receiverId);

            const result = await this.messageService.saveAndDeliverMessage(
                senderId,
                receiverId,
                message,
                socket,
                receiverSocketId,
                messageType
            );

            if (!result.success) {
                socket.emit('messageError', { error: result.error || 'Failed to send message' });
            }
        } catch (error) {
            logger.error('Error in handleSendMessage:', error);
            socket.emit('messageError', { error: 'Internal server error' });
        }
    }

    public async handleGetMessages(socket: AuthenticatedSocket, data: { userId: string; receiverId: string; page?: number; limit?: number }) {
        try {
            const { userId, receiverId, page, limit } = data;
            const result = await this.messageService.getMessages(userId, receiverId, page, limit);

            if (result.success) {
                socket.emit('messagesLoaded', { messages: result.messages || [] });
            } else {
                socket.emit('messageError', { error: result.error || 'Failed to load messages' });
            }
        } catch (error) {
            logger.error('Error in handleGetMessages:', error);
            socket.emit('messageError', { error: 'Internal server error' });
        }
    }

    public async handleMarkMessageAsRead(socket: AuthenticatedSocket, data: { messageId: string }) {
        try {
            const { messageId } = data;
            const result = await this.messageService.markMessageAsRead(messageId);

            if (!result.success) {
                socket.emit('messageError', { error: result.error || 'Failed to mark message as read' });
            }
        } catch (error) {
            logger.error('Error in handleMarkMessageAsRead:', error);
            socket.emit('messageError', { error: 'Internal server error' });
        }
    }
}
