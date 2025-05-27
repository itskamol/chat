import { Socket } from 'socket.io';

export interface SocketData {
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface ServerToClientEvents {
    error: (data: { message: string }) => void;
    messageReceived: (message: any) => void;
    userTyping: (data: {
        userId: string;
        roomId: string;
        isTyping: boolean;
    }) => void;
    userJoined: (data: { userId: string; roomId: string }) => void;
    userLeft: (data: { userId: string; roomId: string }) => void;
    onlineUsers: (users: string[]) => void;
}

export interface ClientToServerEvents {
    sendMessage: (data: {
        receiverId: string;
        content: string;
        messageType: string;
    }) => void;
    getMessages: (data: {
        receiverId: string;
        page?: number;
        limit?: number;
    }) => void;
    markMessageAsRead: (data: { messageId: string }) => void;
    typing: (data: { receiverId: string; isTyping: boolean }) => void;
    getOnlineUsers: () => void;
    joinRoom: (
        data: { roomId: string },
        callback: (result: any) => void
    ) => void;
    leaveRoom: (
        data: { roomId: string },
        callback?: (result: any) => void
    ) => void;
    getRouterRtpCapabilities: (
        data: { roomId: string },
        callback: (result: any) => void
    ) => void;
    createWebRtcTransport: (data: any, callback: (result: any) => void) => void;
    connectWebRtcTransport: (
        data: any,
        callback: (result: any) => void
    ) => void;
    produce: (data: any, callback: (result: any) => void) => void;
    consume: (data: any, callback: (result: any) => void) => void;
    startScreenShare: (data: any, callback: (result: any) => void) => void;
    stopScreenShare: (data: any, callback: (result: any) => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export type AuthenticatedSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;
