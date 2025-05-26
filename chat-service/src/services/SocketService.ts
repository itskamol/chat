import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

export class SocketService {
    private socketToUserIdMap: Map<string, string>;
    private onlineUsers: Map<string, { userId: string; socketId: string; lastSeen: Date }>;

    constructor(private io: SocketIOServer) {
        this.socketToUserIdMap = new Map();
        this.onlineUsers = new Map();
    }

    public setUserSocket(socket: Socket, userId: string): void {
        this.socketToUserIdMap.set(socket.id, userId);
        this.onlineUsers.set(userId, {
            userId,
            socketId: socket.id,
            lastSeen: new Date()
        });
    }

    public removeUserSocket(socket: Socket): void {
        const userId = this.getUserId(socket);
        if (userId) {
            this.socketToUserIdMap.delete(socket.id);
            this.onlineUsers.delete(userId);
        }
    }

    public getUserId(socket: Socket): string | undefined {
        return this.socketToUserIdMap.get(socket.id);
    }

    public getOnlineUsers(): Array<{ userId: string; status: 'online'; lastSeen: Date }> {
        return Array.from(this.onlineUsers.values()).map(user => ({
            userId: user.userId,
            status: 'online' as const,
            lastSeen: user.lastSeen
        }));
    }

    public notifyUserStatusChanged(userId: string, status: 'online' | 'offline', lastSeen: Date): void {
        this.io.emit('userStatusChanged', { userId, status, lastSeen });
    }

    public notifyOnlineUsers(socket: Socket): void {
        socket.emit('onlineUsersList', this.getOnlineUsers());
    }

    public forwardTypingStatus(senderId: string, receiverId: string, isTyping: boolean): void {
        const receiverInfo = this.onlineUsers.get(receiverId);
        if (receiverInfo) {
            this.io.to(receiverInfo.socketId).emit('userTyping', {
                senderId,
                isTyping
            });
        }
    }

    public getSocketIdByUserId(userId: string): string | undefined {
        const userInfo = this.onlineUsers.get(userId);
        return userInfo?.socketId;
    }
}
