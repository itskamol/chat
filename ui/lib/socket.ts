import { io, Socket } from 'socket.io-client';
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    Message,
    SctpCapabilities,
    NewProducerPayload,
    ProducerClosedPayload,
    UserJoinedPayload,
    UserLeftPayload,
    ActiveProducersPayload,
    OnlineUsersListPayload,
    ProduceResponsePayload,
    StartScreenShareResponsePayload,
    StopScreenShareResponsePayload,
    ConsumeResponsePayload,
    CreateWebRtcTransportResponsePayload,
    ConnectWebRtcTransportResponsePayload,
    SendMessagePayload,
} from '@chat/shared';
import { SocketEvent, MessageType } from '@chat/shared';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = (): Socket<
    ServerToClientEvents,
    ClientToServerEvents
> => {
    if (!socket) {
        const token = localStorage.getItem('jwt');
        if (!token) {
            throw new Error('No authentication token found');
        }

        socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        // Setup basic event handlers
        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on('connect_error', (error: Error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('Socket disconnected:', reason);
        });
    }

    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// User status events
export const emitUserOnline = (userId: string): void => {
    const socketInstance = getSocket();
    // Note: USER_ONLINE is not a client-to-server event in the current schema
    // This might need to be handled differently or the schema needs to be updated
    socketInstance.emit(SocketEvent.GET_ONLINE_USERS, () => {});
};

export const emitGetOnlineUsers = (): void => {
    const socketInstance = getSocket();
    socketInstance.emit(SocketEvent.GET_ONLINE_USERS, () => {});
};

// Message events
export const emitSendMessage = (data: SendMessagePayload): void => {
    console.log('Emitting send message:', data);
    const socketInstance = getSocket();
    socketInstance.emit(SocketEvent.SEND_MESSAGE, {
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || MessageType.TEXT,
    });
};

export const onReceiveMessage = (
    callback: (message: Message) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.RECEIVE_MESSAGE, callback);
    return () => {
        socketInstance.off(SocketEvent.RECEIVE_MESSAGE, callback);
    };
};

export const onOnlineUsersList = (
    callback: (payload: OnlineUsersListPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.ONLINE_USERS_LIST, callback);
    return () => {
        socketInstance.off(SocketEvent.ONLINE_USERS_LIST, callback);
    };
};

export const onUserStatusChanged = (
    callback: (payload: { userId: string; status: 'online' | 'offline'; lastSeen: Date; name?: string; avatarUrl?: string; }) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.USER_STATUS_CHANGED, callback);
    return () => {
        socketInstance.off(SocketEvent.USER_STATUS_CHANGED, callback);
    };
};

export const onMessageSent = (
    callback: (confirmation: any) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.MESSAGE_SENT, callback);
    return () => {
        socketInstance.off(SocketEvent.MESSAGE_SENT, callback);
    };
};

export const onMessageError = (
    callback: (error: { error: string }) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.MESSAGE_ERROR, callback);
    return () => {
        socketInstance.off(SocketEvent.MESSAGE_ERROR, callback);
    };
};

// Room events for video calls
export const emitJoinRoom = (roomId: string, callback?: (response: any) => void): void => {
    const socketInstance = getSocket();
    socketInstance.emit(SocketEvent.JOIN_ROOM, { roomId }, callback || (() => {}));
};

export const emitLeaveRoom = (roomId: string, callback?: (response: any) => void): void => {
    const socketInstance = getSocket();
    socketInstance.emit(SocketEvent.LEAVE_ROOM, { roomId }, callback || (() => {}));
};

// Legacy message events (keeping for compatibility)
export const sendMessage = (data: {
    receiverId: string;
    message: string;
    messageType: MessageType;
}): void => {
    const socketInstance = getSocket();
    socketInstance.emit(SocketEvent.SEND_MESSAGE, {
        receiverId: data.receiverId,
        content: data.message,
        type: data.messageType,
    });
};

export const onMessageReceived = (
    callback: (message: Message) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.RECEIVE_MESSAGE, callback);
    return () => {
        socketInstance.off(SocketEvent.RECEIVE_MESSAGE, callback);
    };
};

// WebRTC room management
export const joinRoom = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.JOIN_ROOM, { roomId }, resolve);
    });
};

export const leaveRoom = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.LEAVE_ROOM, { roomId }, resolve);
    });
};

export const getRtpCapabilities = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.GET_ROUTER_RTP_CAPABILITIES, { roomId }, resolve);
    });
};

// WebRTC transport management
export const createTransport = async (data: {
    roomId: string;
    producing: boolean;
    consuming: boolean;
    sctpCapabilities?: SctpCapabilities;
}): Promise<CreateWebRtcTransportResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.CREATE_WEBRTC_TRANSPORT, data, (response) => resolve(response));
    });
};

export const connectTransport = async (data: {
    roomId: string;
    transportId: string;
    dtlsParameters: any;
}): Promise<ConnectWebRtcTransportResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.CONNECT_WEBRTC_TRANSPORT, data, (response) => resolve(response));
    });
};

// Media production and consumption
export const produce = async (data: {
    roomId: string;
    transportId: string;
    kind: 'audio' | 'video';
    rtpParameters: any;
    appData?: any;
}): Promise<ProduceResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.PRODUCE, data, (response) => resolve(response));
    });
};

export const consume = async (data: {
    roomId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: any;
}): Promise<ConsumeResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.CONSUME, data, (response) => resolve(response));
    });
};

export const startScreenShare = async (data: {
    roomId: string;
    transportId: string;
    kind: 'video';
    rtpParameters: any;
    appData?: any;
}): Promise<StartScreenShareResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.START_SCREEN_SHARE, data, (response) => resolve(response));
    });
};

export const stopScreenShare = async (data: {
    roomId: string;
    producerId: string;
}): Promise<StopScreenShareResponsePayload> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        socketInstance.emit(SocketEvent.STOP_SCREEN_SHARE, data, (response) => resolve(response));
    });
};

// WebRTC event subscriptions
export const onNewProducer = (
    callback: (payload: NewProducerPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.NEW_PRODUCER, callback);
    return () => {
        socketInstance.off(SocketEvent.NEW_PRODUCER, callback);
    };
};

export const onProducerClosed = (
    callback: (payload: ProducerClosedPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.PRODUCER_CLOSED, callback);
    return () => {
        socketInstance.off(SocketEvent.PRODUCER_CLOSED, callback);
    };
};

export const onUserJoined = (
    callback: (payload: UserJoinedPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.USER_JOINED, callback);
    return () => {
        socketInstance.off(SocketEvent.USER_JOINED, callback);
    };
};

export const onUserLeft = (
    callback: (payload: UserLeftPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.USER_LEFT, callback);
    return () => {
        socketInstance.off(SocketEvent.USER_LEFT, callback);
    };
};

export const onActiveProducers = (
    callback: (payload: ActiveProducersPayload) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on(SocketEvent.ACTIVE_PRODUCERS, callback);
    return () => {
        socketInstance.off(SocketEvent.ACTIVE_PRODUCERS, callback);
    };
};