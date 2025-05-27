import { 
    AuthenticatedSocket, 
    SocketEvent, 
    ErrorPayload, 
    TypingPayload,
    // No specific payload for getOnlineUsers from client
} from '@shared'; // Assuming @shared is path-mapped in tsconfig
import { SocketController } from '../../controllers/SocketController';
import { logger } from '../../utils';

export const setupBasicHandlers = (
    socket: AuthenticatedSocket,
    socketController: SocketController
): void => {
    // Generic error handler
    socket.on(SocketEvent.ERROR, (error: any) => { // error payload from socket.io itself can be varied
        logger.error('Socket error:', error);
        // Emitting our standardized error payload
        socket.emit(SocketEvent.ERROR, { message: 'Internal server error' } as ErrorPayload);
    });

    // Disconnect handler
    socket.on('disconnect', () => { // DISCONNECT is a standard event string 'disconnect'
        socketController.handleDisconnect(socket);
    });

    // Online users handlers
    socket.on(SocketEvent.GET_ONLINE_USERS, () => {
        socketController.handleGetOnlineUsers(socket);
    });

    socket.on(SocketEvent.TYPING, (data: TypingPayload) => { // Assuming client sends TypingPayload
        if (!socket.data.user) {
            logger.warn('Typing event from unauthenticated user or user data not set on socket.');
            return;
        }
        // The controller will receive the augmented data including senderId
        socketController.handleTyping(socket, {
            ...data, // receiverId, isTyping
            senderId: socket.data.user.id,
        });
    });
};
