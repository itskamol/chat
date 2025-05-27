import { Server as SocketIOServer } from 'socket.io';
import { SocketService } from '../services/SocketService';
import { logger } from '../utils';
import { 
    AuthenticatedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketEvent,
    OnlineUsersListPayload,
    TypingPayload // Base payload from client for typing
} from '@shared';

// Define the expected structure for typing data after augmentation in the handler
interface AugmentedTypingData extends TypingPayload {
    senderId: string;
}

export class SocketController {
    constructor(
        private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        private socketService: SocketService
    ) {}

    public handleConnection(socket: AuthenticatedSocket): void {
        // userId is now expected to be on socket.data.user by the auth middleware
        const userId = socket.data.user?.id;
        if (!userId) {
            logger.error('User ID not found on socket data during connection for socket:', socket.id);
            socket.emit(SocketEvent.ERROR, { message: 'Authentication error: User ID missing.' });
            socket.disconnect(true); // Disconnect if user ID is not there
            return;
        }
        
        try {
            this.socketService.setUserSocket(socket, userId); // setUserSocket now potentially uses socket.data.user for name/avatar
            this.socketService.notifyUserStatusChanged(userId, 'online', new Date());

            // Emit ONLINE_USERS_LIST using the specific payload type
            const onlineUsersPayload: OnlineUsersListPayload = { users: this.socketService.getOnlineUsers() };
            socket.emit(SocketEvent.ONLINE_USERS_LIST, onlineUsersPayload);

            logger.info(`User ${userId} connected`, { socketId: socket.id });
        } catch (error) {
            logger.error(`Error in handleConnection for user ${userId}:`, error);
            socket.emit(SocketEvent.ERROR, { message: 'Internal server error during connection handling.' });
        }
    }

    public handleDisconnect(socket: AuthenticatedSocket): void {
        try {
            const userId = this.socketService.getUserId(socket); // This internally uses socket.id
            if (userId) {
                this.socketService.notifyUserStatusChanged(userId, 'offline', new Date());
                this.socketService.removeUserSocket(socket);
                logger.info(`User ${userId} disconnected`, { socketId: socket.id });
            } else {
                logger.warn('Disconnected socket had no associated user ID:', { socketId: socket.id });
            }
        } catch (error) {
            logger.error(`Error in handleDisconnect for socket ${socket.id}:`, error);
            // Cannot emit to the socket as it's already disconnected. Log is sufficient.
        }
    }

    public handleGetOnlineUsers(socket: AuthenticatedSocket): void {
        try {
            // SocketService.notifyOnlineUsers already sends the correct payload
            this.socketService.notifyOnlineUsers(socket); 
        } catch (error) {
            logger.error(`Error in handleGetOnlineUsers for socket ${socket.id}:`, error);
            socket.emit(SocketEvent.ERROR, { message: 'Failed to get online users.' });
        }
    }

    // Data received here is already augmented by the handler with senderId
    public handleTyping(socket: AuthenticatedSocket, data: AugmentedTypingData): void {
        try {
            // SocketService.forwardTypingStatus expects senderId, receiverId, isTyping
            this.socketService.forwardTypingStatus(data.senderId, data.receiverId, data.isTyping);
        } catch (error) {
            logger.error(`Error in handleTyping for socket ${socket.id}:`, error);
            // Optionally emit an error back if appropriate, though typing is often best-effort
        }
    }
}
