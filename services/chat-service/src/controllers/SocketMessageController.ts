import { Server as SocketIOServer } from 'socket.io';
import { MessageService } from '../services/MessageService';
import { SocketService } from '../services/SocketService'; // May not be directly used here but often included
import { logger } from '../utils';
import {
    AuthenticatedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketEvent,
    SendMessagePayload,
    GetMessagesPayload,
    MarkMessageAsReadPayload,
    MessageErrorPayload,
    MessagesLoadedPayload,
    EmptyPayload,
} from '@chat/shared';
import * as P from '@chat/shared'; // To correctly reference P.EmptyPayload

export class SocketMessageController {
    constructor(
        private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        private messageService: MessageService,
        private socketService: SocketService // Included for completeness, may not be used in every method
    ) {}

    // Method signature updated: userId passed from handler, data is SendMessagePayload
    public async handleSendMessage(socket: AuthenticatedSocket, userId: string, data: SendMessagePayload) {
        try {
            // Data from SendMessagePayload: data.receiverId, data.content, data.type, data.tempId
            const result = await this.messageService.saveAndDeliverMessage(
                userId, // senderId is the authenticated user
                data.receiverId,
                data.content,
                socket, // Pass the sender's socket
                this.socketService.getSocketIdByUserId(data.receiverId), // receiverSocketId
                data.type,
                data.tempId
            );

            if (!result.success) {
                const errorPayload: MessageErrorPayload = { 
                    error: result.error || 'Failed to send message',
                    tempId: result.tempId // Pass back tempId if available from service layer
                };
                socket.emit(SocketEvent.MESSAGE_ERROR, errorPayload);
            }
            // messageSent is handled by MessageService directly to the sender socket
        } catch (error) {
            logger.error('Error in handleSendMessage:', error);
            const errorPayload: MessageErrorPayload = { 
                error: 'Internal server error during message sending.',
                tempId: data.tempId // Pass back client's tempId in case of internal error too
            };
            socket.emit(SocketEvent.MESSAGE_ERROR, errorPayload);
        }
    }

    // Method signature updated: userId passed from handler, data is GetMessagesPayload, callback is present
    public async handleGetMessages(
        socket: AuthenticatedSocket, 
        userId: string, 
        data: GetMessagesPayload,
        callback: (response: MessagesLoadedPayload | MessageErrorPayload) => void
    ) {
        try {
            const result = await this.messageService.getMessages(userId, data.receiverId, data.page, data.limit);

            if (result.success && result.messages) {
                const responsePayload: MessagesLoadedPayload = { 
                    messages: result.messages,
                    receiverId: data.receiverId // Provide context back to client
                };
                // Instead of emitting, use the callback for request-response pattern
                callback(responsePayload);
            } else {
                const errorPayload: MessageErrorPayload = { error: result.error || 'Failed to load messages' };
                callback(errorPayload);
            }
        } catch (error) {
            logger.error('Error in handleGetMessages:', error);
            const errorPayload: MessageErrorPayload = { error: 'Internal server error while fetching messages.' };
            callback(errorPayload);
        }
    }

    // Method signature updated: userId passed from handler, data is MarkMessageAsReadPayload, callback is present
    public async handleMarkMessageAsRead(
        socket: AuthenticatedSocket, 
        userId: string, 
        data: MarkMessageAsReadPayload,
        callback?: (response: MessageErrorPayload | EmptyPayload) => void // From shared ClientToServerEvents
    ) {
        try {
            // Pass userId for validation in service (who is marking as read)
            const result = await this.messageService.markMessageAsRead(data.messageId, userId);

            if (result.success) {
                // Successfully marked as read. Optionally send back the updated message or just success.
                // The client might listen for a generic 'messageUpdated' event or handle this via this callback.
                if (callback) callback({} as P.EmptyPayload); // Empty success response
            } else {
                const errorPayload: MessageErrorPayload = { error: result.error || 'Failed to mark message as read', messageId: data.messageId };
                if (callback) callback(errorPayload);
            }
        } catch (error) {
            logger.error('Error in handleMarkMessageAsRead:', error);
            const errorPayload: MessageErrorPayload = { error: 'Internal server error while marking message as read.', messageId: data.messageId };
            if (callback) callback(errorPayload);
        }
    }
}
