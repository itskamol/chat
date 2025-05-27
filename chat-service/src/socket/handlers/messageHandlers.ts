import { 
    AuthenticatedSocket, 
    SocketEvent,
    SendMessagePayload,
    GetMessagesPayload,
    MarkMessageAsReadPayload,
    MessageType // Assuming MessageType might be used if not already part of SendMessagePayload
} from '@chat/shared';
import { SocketMessageController } from '../../controllers/SocketMessageController';
import { logger } from '../../utils'; // Added logger for safety

export const setupMessageHandlers = (
    socket: AuthenticatedSocket,
    messageController: SocketMessageController,
    // userId: string // userId can be reliably obtained from socket.data.user.id
): void => {
    if (!socket.data.user || !socket.data.user.id) {
        logger.error('User not authenticated or user ID missing in socket data for message handlers.');
        // Optionally, emit an error back to the client or simply don't register handlers.
        socket.emit(SocketEvent.ERROR, { message: 'Authentication error: Cannot register message handlers.' });
        return;
    }
    const userId = socket.data.user.id;

    // Message Events
    socket.on(SocketEvent.SEND_MESSAGE, (data: SendMessagePayload) => {
        messageController.handleSendMessage(socket, userId, {
            content: data.content, 
            receiverId: data.receiverId,
            type: data.type,
            tempId: data.tempId 
        });
    });

    socket.on(SocketEvent.GET_MESSAGES, (data: GetMessagesPayload, callback) => {
        // The GetMessagesPayload from @shared does not include userId,
        // as it's context-dependent (the user making the request).
        // The controller will receive userId separately from the socket.
        messageController.handleGetMessages(socket, userId, data, callback);
    });

    socket.on(SocketEvent.MARK_MESSAGE_AS_READ, (data: MarkMessageAsReadPayload, callback) => {
        // Similar to getMessages, userId (who is marking as read) could be contextual
        // but messageId is the key part of the payload.
        // The controller might need userId for authorization/validation.
        messageController.handleMarkMessageAsRead(socket, userId, data, callback);
    });
};
