import { AuthenticatedSocket } from '@chat/shared';
import { SocketController } from '../../controllers/SocketController';
import { logger } from '../../utils';

export const setupBasicHandlers = (
    socket: AuthenticatedSocket,
    socketController: SocketController
): void => {
    // Generic error handler
    socket.on('error', (error) => {
        logger.error('Socket error:', error);
        socket.emit('error', { message: 'Internal server error' });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        socketController.handleDisconnect(socket);
    });

    // Online users handlers
    socket.on('getOnlineUsers', () => {
        socketController.handleGetOnlineUsers(socket);
    });

    socket.on('typing', (data) => {
        socketController.handleTyping(socket, {
            ...data,
            senderId: socket.data.user!.id,
        });
    });
};
