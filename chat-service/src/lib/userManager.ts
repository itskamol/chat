import { Socket, Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../server'; // Adjust path as needed
import { RoomManager } from './roomManager'; // For handleLeaveRoom dependency

// Interface for online user data
export interface IOnlineUserData {
    socketId: string;
    userId: string;
    lastSeen: Date;
}

// Interface for the onlineUsers Map
export interface IOnlineUsers extends Map<string, IOnlineUserData> {}

// Store for online users
const onlineUsers: IOnlineUsers = new Map<string, IOnlineUserData>();
const socketToUserIdMap = new Map<string, string>(); // socketId -> userId

export function getUserIdFromSocket(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): string | undefined {
    return socket.data.userId || socketToUserIdMap.get(socket.id);
}

export function initializeUserManager(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    roomManager: RoomManager // Pass RoomManager instance
) {
    // User login qilganda
    socket.on('userOnline', (userId: string) => {
        onlineUsers.set(userId, {
            socketId: socket.id,
            userId: userId,
            lastSeen: new Date(),
        });
        socket.data.userId = userId;
        socketToUserIdMap.set(socket.id, userId);

        socket.broadcast.emit('userStatusChanged', {
            userId: userId,
            status: 'online',
            lastSeen: new Date(),
        });
        logger.info(`User ${userId} is now online`, { socketId: socket.id });

        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user): { userId: string; status: 'online'; lastSeen: Date } => ({
                userId: user.userId,
                status: 'online', // Explicitly typed as 'online'
                lastSeen: user.lastSeen,
            })
        );
        socket.emit('onlineUsersList', onlineUsersList);
    });

    // User disconnect bo'lganda
    socket.on('disconnect', async () => {
        logger.info('Client disconnected', { socketId: socket.id });
        const userId = getUserIdFromSocket(socket);
        const roomId = roomManager.getSocketToRoomMap().get(socket.id); // Use getter from RoomManager

        if (userId) {
            onlineUsers.delete(userId);
            socketToUserIdMap.delete(socket.id);
            socket.broadcast.emit('userStatusChanged', {
                userId: userId,
                status: 'offline',
                lastSeen: new Date(),
            });
            logger.info(`User ${userId} is now offline`);

            if (roomId) {
                // Call handleLeaveRoom from RoomManager
                await roomManager.handleLeaveRoom(socket, roomId, userId, true, io);
            }
        }
    });

    // Online users listini olish
    socket.on('getOnlineUsers', () => {
        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user): { userId: string; status: 'online'; lastSeen: Date } => ({
                userId: user.userId,
                status: 'online', // Explicitly typed as 'online'
                lastSeen: user.lastSeen,
            })
        );
        socket.emit('onlineUsersList', onlineUsersList);
    });
}

// Export the onlineUsers map if it needs to be accessed directly by other modules (e.g., chatHandler)
// However, it's better to provide functions to interact with it if possible.
export const getOnlineUser = (userId: string): IOnlineUserData | undefined => {
    return onlineUsers.get(userId);
};

export const getOnlineUsersMap = (): IOnlineUsers => {
    return onlineUsers;
};
