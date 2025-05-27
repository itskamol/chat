import { io, Socket } from 'socket.io-client';

interface ServerToClientEvents {
    error: (data: { message: string }) => void;
    messageReceived: (message: any) => void;
    userTyping: (data: {
        userId: string;
        roomId: string;
        isTyping: boolean;
    }) => void;
    userJoined: (data: { userId: string; roomId: string }) => void;
    userLeft: (data: { userId: string; roomId: string }) => void;
    onlineUsers: (users: Array<{ userId: string; status: string }>) => void;
    userStatusChanged: (data: {
        userId: string;
        status: string;
        lastSeen: string;
    }) => void;
    messageSent: (confirmation: any) => void;
    messageError: (error: { error: string }) => void;
}

interface ClientToServerEvents {
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
    userOnline: (userId: string) => void;
    joinRoom: (
        data: { roomId: string },
        callback: (result: any) => void
    ) => void;
    leaveRoom: (
        data: { roomId: string },
        callback?: (result: any) => void
    ) => void;
}

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

        socket = io(
            process.env.NEXT_PUBLIC_WS_URL,
            {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
            }
        );

        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
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

// Event emitters
export const emitUserOnline = (userId: string): void => {
    const socketInstance = getSocket();
    socketInstance.emit('userOnline', userId);
};

export const emitGetOnlineUsers = (): void => {
    const socketInstance = getSocket();
    socketInstance.emit('getOnlineUsers');
};

export const emitSendMessage = (data: {
    senderId: string;
    receiverId: string;
    message: string;
    messageType: string;
}): void => {
    const socketInstance = getSocket();
    socketInstance.emit('sendMessage', {
        receiverId: data.receiverId,
        content: data.message,
        messageType: data.messageType,
    });
};

export const emitTyping = (data: {
    receiverId: string;
    isTyping: boolean;
}): void => {
    const socketInstance = getSocket();
    socketInstance.emit('typing', data);
};

export const emitGetMessages = (data: {
    receiverId: string;
    page?: number;
    limit?: number;
}): void => {
    const socketInstance = getSocket();
    socketInstance.emit('getMessages', data);
};

export const emitMarkMessageAsRead = (messageId: string): void => {
    const socketInstance = getSocket();
    socketInstance.emit('markMessageAsRead', { messageId });
};

// Event listeners
export const onReceiveMessage = (
    callback: (message: any) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('messageReceived', callback);

    return () => {
        socketInstance.off('messageReceived', callback);
    };
};

export const onOnlineUsersList = (
    callback: (users: Array<{ userId: string; status: string }>) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('onlineUsers', callback);

    return () => {
        socketInstance.off('onlineUsers', callback);
    };
};

export const onUserStatusChanged = (
    callback: (data: {
        userId: string;
        status: string;
        lastSeen: string;
    }) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('userStatusChanged', callback);

    return () => {
        socketInstance.off('userStatusChanged', callback);
    };
};

export const onMessageSent = (
    callback: (confirmation: any) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('messageSent', callback);

    return () => {
        socketInstance.off('messageSent', callback);
    };
};

export const onMessageError = (
    callback: (error: { error: string }) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('messageError', callback);

    return () => {
        socketInstance.off('messageError', callback);
    };
};

export const onUserTyping = (
    callback: (data: {
        userId: string;
        roomId: string;
        isTyping: boolean;
    }) => void
): (() => void) => {
    const socketInstance = getSocket();
    socketInstance.on('userTyping', callback);

    return () => {
        socketInstance.off('userTyping', callback);
    };
};

// WebRTC related functions
export const emitJoinRoom = (
    roomId: string,
    callback: (result: any) => void
): void => {
    const socketInstance = getSocket();
    socketInstance.emit('joinRoom', { roomId }, callback);
};

export const emitLeaveRoom = (
    roomId: string,
    callback?: (result: any) => void
): void => {
    const socketInstance = getSocket();
    socketInstance.emit('leaveRoom', { roomId }, callback);
};

// Initialize socket connection
export const initializeSocket = (): Promise<
    Socket<ServerToClientEvents, ClientToServerEvents>
> => {
    return new Promise((resolve, reject) => {
        try {
            const socketInstance = getSocket();

            if (socketInstance.connected) {
                resolve(socketInstance);
            } else {
                socketInstance.on('connect', () => {
                    resolve(socketInstance);
                });

                socketInstance.on('connect_error', (error) => {
                    reject(error);
                });
            }
        } catch (error) {
            reject(error);
        }
    });
};
