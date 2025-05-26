import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { MessageService } from '../services/MessageService';
import { SocketService } from '../services/SocketService';
import { logger } from '../utils';

export class SocketMessageController {
    constructor(
        private io: SocketIOServer,
        private messageService: MessageService,
        private socketService: SocketService
    ) {}

    public async handleSendMessage(socket: Socket, data: { senderId: string; receiverId: string; message: string }) {
        try {
            const { senderId, receiverId, message } = data;
            
            // Get receiver's socket ID if they're online
            const receiverSocketId = this.socketService.getSocketIdByUserId(receiverId);

            const result = await this.messageService.saveAndDeliverMessage(
                senderId,
                receiverId,
                message,
                socket,
                receiverSocketId
            );

            if (!result.success) {
                socket.emit('messageError', { error: result.error || 'Failed to send message' });
            }
        } catch (error) {
            logger.error('Error in handleSendMessage:', error);
            socket.emit('messageError', { error: 'Internal server error' });
        }
    }

    public async handleGetMessages(socket: Socket, data: { userId: string; contactId: string; page?: number; limit?: number }) {
        try {
            const { userId, contactId, page, limit } = data;
            const result = await this.messageService.getMessages(userId, contactId, page, limit);

            if (result.success) {
                socket.emit('messagesLoaded', { messages: result.messages });
            } else {
                socket.emit('messageError', { error: result.error || 'Failed to load messages' });
            }
        } catch (error) {
            logger.error('Error in handleGetMessages:', error);
            socket.emit('messageError', { error: 'Internal server error' });
        }
    }

    public async handleMarkMessageAsRead(socket: Socket, data: { messageId: string }) {
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
