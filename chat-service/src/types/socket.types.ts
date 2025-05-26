import { SignalingEvents } from './signaling.types';

export interface ServerToClientEvents extends SignalingEvents {
    userStatusChanged: (data: { userId: string; status: 'online' | 'offline'; lastSeen: Date }) => void;
    onlineUsersList: (data: Array<{ userId: string; status: 'online'; lastSeen: Date }>) => void;
    receiveMessage: (data: { 
        _id: string;
        senderId: string;
        receiverId: string;
        message: string;
        createdAt: Date;
    }) => void;
    messageSent: (data: {
        _id: string;
        senderId: string;
        receiverId: string;
        message: string;
        createdAt: Date;
        delivered: boolean;
    }) => void;
    messageError: (data: { error: string }) => void;
    messagesLoaded: (data: { messages: any[] }) => void;
    messageRead: (data: { messageId: string }) => void;
    userTyping: (data: { senderId: string; isTyping: boolean }) => void;
}

export interface ClientToServerEvents extends SignalingEvents {
    authenticate: (data: { userId: string }) => void;
    userOnline: (userId: string) => void;
    sendMessage: (data: { receiverId: string; message: string }) => void;
    getMessages: (data: { contactId: string; page?: number; limit?: number }) => void;
    markMessageAsRead: (data: { messageId: string }) => void;
    getOnlineUsers: () => void;
    typing: (data: { senderId: string; receiverId: string; isTyping: boolean }) => void;
}

export interface InterServerEvents {
    // Currently empty
}

export interface SocketData {
    userId?: string;
    roomId?: string;
}
