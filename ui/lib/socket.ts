import { io, Socket } from 'socket.io-client';
import type { 
    ServerToClientEvents, 
    ClientToServerEvents,
    Message,
    MessageType,
    WebRTCProducer,
    WebRTCUser,
    WebRTCTransportOptions
} from '@chat/shared';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
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

        socket.on('error', (error: { message: string }) => {
            console.error('Socket error:', error.message);
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

// Message events
export const sendMessage = (data: {
    receiverId: string;
    message: string;
    messageType: MessageType;
}): void => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.emit('sendMessage', {
        receiverId: data.receiverId,
        message: data.message,
        messageType: data.messageType,
    });
};

export const onMessageReceived = (callback: (message: Message) => void): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('messageReceived', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('messageReceived', callback);
    };
};

// WebRTC room management
export const joinRoom = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('joinRoom', { roomId }, resolve);
    });
};

export const leaveRoom = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('leaveRoom', { roomId }, resolve);
    });
};

export const getRtpCapabilities = async (roomId: string): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('getRouterRtpCapabilities', { roomId }, resolve);
    });
};

// WebRTC transport management
export const createTransport = async (
    data: WebRTCTransportOptions & { roomId: string }
): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('createWebRtcTransport', data, resolve);
    });
};

export const connectTransport = async (
    data: {
        roomId: string;
        transportId: string;
        dtlsParameters: any;
    }
): Promise<void> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('connectWebRtcTransport', data, resolve);
    });
};

// Media production and consumption
export const produce = async (
    data: {
        roomId: string;
        transportId: string;
        kind: 'audio' | 'video';
        rtpParameters: any;
        appData?: any;
    }
): Promise<{ id: string }> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('produce', data, resolve);
    });
};

export const consume = async (
    data: {
        roomId: string;
        transportId: string;
        producerId: string;
        rtpCapabilities: any;
    }
): Promise<any> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('consume', data, resolve);
    });
};

export const startScreenShare = async (
    data: {
        roomId: string;
        transportId: string;
        kind: 'video';
        rtpParameters: any;
        appData?: any;
    }
): Promise<{ id: string }> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('startScreenShare', data, resolve);
    });
};

export const stopScreenShare = async (
    data: { roomId: string; producerId: string }
): Promise<boolean> => {
    const socketInstance = getSocket();
    return new Promise((resolve) => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.emit('stopScreenShare', data, resolve);
    });
};

// WebRTC event subscriptions
export const onNewProducer = (
    callback: (data: WebRTCProducer & { socketId: string }) => void
): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('newProducer', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('newProducer', callback);
    };
};

export const onProducerClosed = (
    callback: (data: { producerId: string; userId: string; socketId: string }) => void
): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('producerClosed', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('producerClosed', callback);
    };
};

export const onUserJoined = (callback: (data: WebRTCUser) => void): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('userJoined', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('userJoined', callback);
    };
};

export const onUserLeft = (callback: (data: WebRTCUser) => void): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('userLeft', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('userLeft', callback);
    };
};

export const onActiveProducers = (
    callback: (producers: WebRTCProducer[]) => void
): (() => void) => {
    const socketInstance = getSocket();
    // @ts-ignore - Socket.IO types issue
    socketInstance.on('activeProducers', callback);
    return () => {
        // @ts-ignore - Socket.IO types issue
        socketInstance.off('activeProducers', callback);
    };
};
