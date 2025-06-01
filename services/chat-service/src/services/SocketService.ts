import { 
    AuthenticatedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketEvent,
    UserStatusChangedPayload,
    OnlineUsersListPayload,
    UserTypingPayload,
    OnlineUser // Used within OnlineUsersListPayload
} from '@chat/shared';
import { Server as SocketIOServer } from 'socket.io'; // Standard import

export class SocketService {
    private socketToUserIdMap: Map<string, string>;
    // Store more user details for richer OnlineUser objects
    private onlineUsers: Map<string, { userId: string; socketId: string; lastSeen: Date; name?: string; avatarUrl?: string }>;

    constructor(private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
        this.socketToUserIdMap = new Map();
        this.onlineUsers = new Map();
    }

    // When user connects, their basic info (name, avatar) might be available from auth/socket.data.user
    public setUserSocket(socket: AuthenticatedSocket, userId: string): void {
        this.socketToUserIdMap.set(socket.id, userId);
        const user = socket.data.user; // User object from shared types, should be on socket.data
        this.onlineUsers.set(userId, {
            userId,
            socketId: socket.id,
            lastSeen: new Date(),
            name: user?.name,
            avatarUrl: user?.avatarUrl 
        });
    }

    public removeUserSocket(socket: AuthenticatedSocket): void {
        const userId = this.getUserId(socket);
        if (userId) {
            this.socketToUserIdMap.delete(socket.id);
            this.onlineUsers.delete(userId);
        }
    }

    public getUserId(socket: AuthenticatedSocket): string | undefined {
        return this.socketToUserIdMap.get(socket.id);
    }

    public getOnlineUsers(): OnlineUser[] { // Using the OnlineUser type from shared/payloads
        return Array.from(this.onlineUsers.values()).map(user => ({
            userId: user.userId,
            name: user.name,
            avatarUrl: user.avatarUrl,
            status: 'online' as const,
            lastSeen: user.lastSeen
        }));
    }

    public notifyUserStatusChanged(userId: string, status: 'online' | 'offline', lastSeen: Date): void {
        const user = this.onlineUsers.get(userId) || { userId, name: undefined, avatarUrl: undefined }; // Get user details if available
        const payload: UserStatusChangedPayload = { 
            userId, 
            status, 
            lastSeen,
            name: user.name,
            avatarUrl: user.avatarUrl
        };
        this.io.emit(SocketEvent.USER_STATUS_CHANGED, payload);
    }

    public notifyOnlineUsers(socket: AuthenticatedSocket): void {
        const payload: OnlineUsersListPayload = { users: this.getOnlineUsers() };
        socket.emit(SocketEvent.ONLINE_USERS_LIST, payload);
    }

    public forwardTypingStatus(senderId: string, receiverId: string, isTyping: boolean): void {
        const receiverInfo = this.onlineUsers.get(receiverId);
        if (receiverInfo) {
            const payload: UserTypingPayload = {
                senderId,
                isTyping
            };
            this.io.to(receiverInfo.socketId).emit(SocketEvent.USER_TYPING, payload);
        }
    }

    public getSocketIdByUserId(userId: string): string | undefined {
        const userInfo = this.onlineUsers.get(userId);
        return userInfo?.socketId;
    }
}
