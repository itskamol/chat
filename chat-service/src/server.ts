import { Server } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import axios from 'axios'; // For making HTTP requests to media-server
import app from './app';
import { connectDB } from './database'; // Message model is used in chatHandler
import config from './config/config';
import { logger } from './utils';
import { SignalingEvents } from './signaling.types';

// Import handlers and managers
import { registerChatHandlers } from './socketHandlers/chatHandler';
import { registerWebRTCHandlers } from './socketHandlers/webrtcHandler';
import { initializeUserManager, getOnlineUsersMap } from './lib/userManager';
import { RoomManager } from './lib/roomManager';

let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});

// Define stricter types for Socket.IO Server and Socket
// These interfaces might need to be in a shared types file if handlers need them directly
// For now, keeping them here as they define the server's expected event shapes.
export interface ServerToClientEvents extends SignalingEvents {
    userStatusChanged: (data: {
        userId: string;
        status: 'online' | 'offline';
        lastSeen: Date;
    }) => void;
    onlineUsersList: (
        data: Array<{ userId: string; status: 'online'; lastSeen: Date }>
    ) => void;
    receiveMessage: (data: unknown) => void; // Replace unknown with actual message type from database/models
    messageSent: (data: unknown) => void; // Replace unknown with actual message confirmation type
    messageError: (data: { error: string }) => void;
    userTyping: (data: { senderId: string; isTyping: boolean }) => void;
}

export interface ClientToServerEvents extends SignalingEvents {
    userOnline: (userId: string) => void;
    sendMessage: (data: {
        senderId: string;
        receiverId: string;
        message: string;
    }) => void;
    getOnlineUsers: () => void;
    typing: (data: {
        senderId: string;
        receiverId: string;
        isTyping: boolean;
    }) => void;
}

export interface InterServerEvents {
    // Currently none
}

export interface SocketData {
    userId?: string; // Store userId associated with this socket
    roomId?: string; // Store current room of the socket
}

const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Initialize managers
const roomManager = new RoomManager();
// const onlineUsers = getOnlineUsersMap(); //userManager will manage this internally

io.on(
    'connection',
    (
        socket: Socket<
            ClientToServerEvents,
            ServerToClientEvents,
            InterServerEvents,
            SocketData
        >
    ) => {
        logger.info('Client connected', { socketId: socket.id });

        // Initialize user-related event handlers and pass dependencies
        initializeUserManager(io, socket, roomManager);

        // Register chat-related event handlers and pass dependencies
        registerChatHandlers(io, socket, getOnlineUsersMap()); // Pass the map getter

        // Register WebRTC-related event handlers and pass dependencies
        registerWebRTCHandlers(io, socket, roomManager);

        // Note: 'disconnect' is now handled within initializeUserManager
    }
);

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    logger.error('Unexpected error occurred:', error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
