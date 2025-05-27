import { Socket } from 'socket.io';
import { User, Message, MessageType } from './index';

export interface ClientToServerEvents {
    // Basic events
    sendMessage: (data: {
        receiverId: string;
        content: string;
        type?: MessageType;
    }) => void;

    // User presence and typing
    getOnlineUsers: () => void;
    typing: (data: { receiverId: string; isTyping: boolean }) => void;

    // Room management
    joinRoom: (
        data: { roomId: string },
        callback: (result: any) => void
    ) => void;
    leaveRoom: (
        data: { roomId: string },
        callback?: (result: any) => void
    ) => void;

    // WebRTC capabilities
    getRouterRtpCapabilities: (
        data: { roomId: string },
        callback: (result: any) => void
    ) => void;

    // Transport management
    createWebRtcTransport: (
        data: {
            roomId: string;
            producing: boolean;
            consuming: boolean;
            sctpCapabilities?: any;
        },
        callback: (result: any) => void
    ) => void;

    connectWebRtcTransport: (
        data: {
            roomId: string;
            transportId: string;
            dtlsParameters: any;
        },
        callback: (result: any) => void
    ) => void;

    // Media handling
    produce: (
        data: {
            roomId: string;
            transportId: string;
            kind: 'audio' | 'video';
            rtpParameters: any;
            appData?: any;
        },
        callback: (result: any) => void
    ) => void;

    consume: (
        data: {
            roomId: string;
            transportId: string;
            producerId: string;
            rtpCapabilities: any;
        },
        callback: (result: any) => void
    ) => void;

    // Screen sharing
    startScreenShare: (
        data: {
            roomId: string;
            transportId: string;
            kind: 'video';
            rtpParameters: any;
            appData?: any;
        },
        callback: (result: any) => void
    ) => void;
    markMessageAsRead: (data: { messageId: string }) => void;
    getMessages: (
        data: {
            userId: string;
            receiverId: string;
            page?: number;
            limit?: number;
        },
        callback: (result: { messages: Message[] }) => void
    ) => void;
    stopScreenShare: (
        data: {
            roomId: string;
            producerId: string;
        },
        callback: (result: any) => void
    ) => void;
}

export interface ServerToClientEvents {
    // Basic events
    error: (data: { message: string }) => void;
    messageReceived: (message: Message) => void;
    messageError: (data: { error: string }) => void;
    messagesLoaded: (data: { messages: Message[] }) => void;
    onlineUsersList: (data: Array<{ userId: string; status: 'online'; lastSeen: Date }>) => void;
    // User presence and typing
    userTyping: (data: { userId: string; isTyping: boolean }) => void;
    userJoined: (data: {
        userId: string;
        roomId: string;
        socketId?: string;
        name?: string;
    }) => void;
    userLeft: (data: {
        userId: string;
        roomId: string;
        socketId?: string;
        name?: string;
    }) => void;
    onlineUsers: (users: User[]) => void;

    // WebRTC Producer events
    newProducer: (data: {
        producerId: string;
        userId: string;
        kind: 'audio' | 'video';
        appData?: { type?: 'webcam' | 'screen' };
        socketId: string;
    }) => void;

    producerClosed: (data: {
        producerId: string;
        userId: string;
        socketId: string;
    }) => void;

    activeProducers: (
        producers: Array<{
            producerId: string;
            userId: string;
            kind: 'audio' | 'video';
            appData?: { type?: 'webcam' | 'screen' };
        }>
    ) => void;

    // Transport events
    transportCreated: (data: {
        transportId: string;
        transportOptions: any;
    }) => void;

    transportConnected: (data: { transportId: string }) => void;

    // Consumer events
    consumerCreated: (data: {
        consumerId: string;
        producerId: string;
        kind: 'audio' | 'video';
        rtpParameters: any;
    }) => void;

    // Screen sharing events
    screenShareStarted: (data: { userId: string; producerId: string }) => void;

    screenShareStopped: (data: { userId: string; producerId: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    user?: {
        id: string;
        email?: string;
        name?: string;
    };
    userId?: string;
    roomId?: string;
}

// Common AuthenticatedSocket type
export interface AuthenticatedSocket
    extends Socket<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    > {
    userId?: string;
    data: SocketData;
}

// WebRTC specific types
export interface WebRTCUser {
    userId: string;
    roomId: string;
    socketId?: string;
    name?: string;
}

export interface WebRTCProducer {
    producerId: string;
    userId: string;
    kind: 'audio' | 'video';
    appData?: { type?: 'webcam' | 'screen' };
}

export interface TransportDetails {
    transportId: string;
    transportOptions: any;
}

export interface ConsumerDetails {
    consumerId: string;
    producerId: string;
    kind: 'audio' | 'video';
    rtpParameters: any;
}
