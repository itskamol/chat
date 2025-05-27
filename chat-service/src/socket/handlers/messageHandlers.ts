import { AuthenticatedSocket } from '@chat/shared';
import { SocketMessageController } from '../../controllers/SocketMessageController';

export const setupMessageHandlers = (
    socket: AuthenticatedSocket,
    messageController: SocketMessageController,
    userId: string
): void => {
    // Message Events
    socket.on('sendMessage', (data) => {
        messageController.handleSendMessage(socket, {
            senderId: userId,
            message: data.content,
            receiverId: data.receiverId,
            messageType: data.type,
        });
    });

    socket.on('getMessages', (data) => {
        messageController.handleGetMessages(socket, { 
            userId,
            receiverId: data.receiverId, 
            page: data.page,
            limit: data.limit 
        });
    });

    socket.on('markMessageAsRead', (data) => {
        messageController.handleMarkMessageAsRead(socket, {
            ...data,
        });
    });
};
