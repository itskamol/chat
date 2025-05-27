import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config/config';
import { logger } from './utils';
import { connectDB } from './database';
import { socketAuthMiddleware } from './middleware/socketAuth';

// Import services and controllers
import { MediaServerClient } from './services/MediaServerClient';
import { RoomService } from './services/RoomService';
import { WebRTCService } from './services/WebRTCService';
import { SocketService } from './services/SocketService';
import { MessageService } from './services/MessageService';
import { WebRTCController } from './controllers/WebRTCController';
import { SocketController } from './controllers/SocketController';
import { SocketMessageController } from './controllers/SocketMessageController';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    AuthenticatedSocket,
} from './types/socket.types';

// Initialize server and database
let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    logger.info(`Server is running on port ${config.PORT}`);
});

// Initialize Socket.IO server
const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// Initialize services
const mediaServerClient = new MediaServerClient();
const roomService = new RoomService();
const webrtcService = new WebRTCService(roomService, mediaServerClient);
const socketService = new SocketService(io);
const messageService = new MessageService(io);

// Initialize controllers
const webrtcController = new WebRTCController(io, roomService, webrtcService);
const socketController = new SocketController(io, socketService);
const socketMessageController = new SocketMessageController(
    io,
    messageService,
    socketService
);

// Apply global socket authentication middleware
io.use(socketAuthMiddleware);

// Socket.IO connection handling
io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info('Client connected', {
        socketId: socket.id,
        userId: socket.data.user?.id,
    });

    if (!socket.data.user) {
        logger.error('Socket connected without user data');
        socket.disconnect();
        return;
    }

    const userId = socket.data.user.id;

    // Generic error handler
    socket.on('error', (error) => {
        logger.error('Socket error:', error);
        socket.emit('error', { message: 'Internal server error' });
    });

    // Disconnect
    socket.on('disconnect', () => {
        socketController.handleDisconnect(socket);
    });

    // Basic socket events
    socket.on('getOnlineUsers', () => {
        socketController.handleGetOnlineUsers(socket);
    });

    socket.on('typing', (data) => {
        socketController.handleTyping(socket, { ...data, senderId: userId });
    });

    // Message Events
    socket.on('sendMessage', (data) => {
        socketMessageController.handleSendMessage(socket, {
            senderId: userId,
            message: data.content,
            receiverId: data.receiverId,
            messageType: data.messageType,
        });
    });

    // socket.on('getMessages', (data) => {
    //     socketMessageController.handleGetMessages(socket, { ...data, userId });
    // });

    // socket.on('markMessageAsRead', (data) => {
    //     socketMessageController.handleMarkMessageAsRead(socket, {
    //         ...data,
    //     });
    // });

    // WebRTC Events
    socket.on('joinRoom', async ({ roomId }, callback) => {
        const result = await webrtcController.handleJoinRoom(
            socket,
            { roomId },
            userId
        );
        callback(result);
    });

    socket.on('leaveRoom', async ({ roomId }, callback) => {
        const result = await webrtcController.handleLeaveRoom(
            socket,
            { roomId },
            userId
        );
        if (callback) callback(result);
    });

    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        const result = await webrtcController.handleGetRtpCapabilities(
            socket,
            { roomId },
            userId
        );
        callback(result);
    });

    socket.on(
        'createWebRtcTransport',
        async (
            { roomId, producing, consuming, sctpCapabilities },
            callback
        ) => {
            const result = await webrtcController.handleCreateTransport(
                socket,
                { roomId, producing, consuming, sctpCapabilities },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'connectWebRtcTransport',
        async ({ roomId, transportId, dtlsParameters }, callback) => {
            const result = await webrtcController.handleConnectTransport(
                socket,
                { roomId, transportId, dtlsParameters },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'produce',
        async (
            { roomId, transportId, kind, rtpParameters, appData },
            callback
        ) => {
            const result = await webrtcController.handleProduce(
                socket,
                { roomId, transportId, kind, rtpParameters, appData },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'consume',
        async (
            { roomId, transportId, producerId, rtpCapabilities },
            callback
        ) => {
            const result = await webrtcController.handleConsume(
                socket,
                { roomId, transportId, producerId, rtpCapabilities },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'startScreenShare',
        async (
            { roomId, transportId, kind, rtpParameters, appData },
            callback
        ) => {
            const result = await webrtcController.handleScreenShare(
                socket,
                { roomId, transportId, kind, rtpParameters, appData },
                userId
            );
            callback(result);
        }
    );

    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => {
        const result = await webrtcController.handleStopScreenShare(
            socket,
            { roomId, producerId },
            userId
        );
        callback(result);
    });
});

// ...existing code...
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
