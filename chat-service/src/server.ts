import { Server } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config/config';
import { logger } from './utils';
import { connectDB } from './database';

// Import services and controllers
import { MediaServerClient } from './services/MediaServerClient';
import { RoomService } from './services/RoomService';
import { WebRTCService } from './services/WebRTCService';
import { SocketService } from './services/SocketService';
import { MessageService } from './services/MessageService';
import { WebRTCController } from './controllers/WebRTCController';
import { SocketController } from './controllers/SocketController';
import { SocketMessageController } from './controllers/SocketMessageController';
import { SignalingEvents } from './types/signaling.types';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types/socket.types';

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
const socketMessageController = new SocketMessageController(io, messageService, socketService);

// Socket.IO connection handling
io.on('connection', async (socket: Socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // Helper to check user authentication
    function getUserId(): string | undefined {
        return socketService.getUserId(socket);
    }

    // Socket authentication middleware
    socket.use(([event, ...args], next) => {
        const userId = getUserId();
        if (!userId && event !== 'authenticate') {
            next(new Error('Not authenticated'));
            return;
        }
        next();
    });

    // Generic error handler
    socket.on('error', (error) => {
        logger.error('Socket error:', error);
        socket.emit('error', { message: 'Internal server error' });
    });

    // Socket Events

    // Authentication
    socket.on('authenticate', ({ userId }) => {
        socketController.handleConnection(socket, userId);
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
        socketController.handleTyping(socket, data);
    });

    // Message Events
    socket.on('sendMessage', (data) => {
        const userId = getUserId();
        if (!userId) return;
        socketMessageController.handleSendMessage(socket, { ...data, senderId: userId });
    });

    socket.on('getMessages', (data) => {
        const userId = getUserId();
        if (!userId) return;
        socketMessageController.handleGetMessages(socket, { ...data, userId });
    });

    socket.on('markMessageAsRead', (data) => {
        const userId = getUserId();
        if (!userId) return;
        socketMessageController.handleMarkMessageAsRead(socket, data);
    });

    // WebRTC Events
    socket.on('joinRoom', async ({ roomId }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleJoinRoom(socket, { roomId }, userId);
        callback(result);
    });

    socket.on('leaveRoom', async ({ roomId }, callback) => {
        const userId = getUserId();
        if (!userId) return callback?.({ error: 'User not authenticated' });
        const result = await webrtcController.handleLeaveRoom(socket, { roomId }, userId);
        if (callback) callback(result);
    });

    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleGetRtpCapabilities(socket, { roomId }, userId);
        callback(result);
    });

    socket.on('createWebRtcTransport', async ({ roomId, producing, consuming, sctpCapabilities }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleCreateTransport(socket, { roomId, producing, consuming, sctpCapabilities }, userId);
        callback(result);
    });

    socket.on('connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleConnectTransport(socket, { roomId, transportId, dtlsParameters }, userId);
        callback(result);
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleProduce(socket, { roomId, transportId, kind, rtpParameters, appData }, userId);
        callback(result);
    });

    socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleConsume(socket, { roomId, transportId, producerId, rtpCapabilities }, userId);
        callback(result);
    });

    socket.on('startScreenShare', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleScreenShare(socket, { roomId, transportId, kind, rtpParameters, appData }, userId);
        callback(result);
    });

    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => {
        const userId = getUserId();
        if (!userId) return callback({ error: 'User not authenticated' });
        const result = await webrtcController.handleStopScreenShare(socket, { roomId, producerId }, userId);
        callback(result);
    });
});

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
