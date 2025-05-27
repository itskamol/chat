import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config/config';
import { logger } from './utils';
import { connectDB } from './database';

// Services
import { MediaServerClient } from './services/MediaServerClient';
import { RoomService } from './services/RoomService';
import { WebRTCService } from './services/WebRTCService';
import { SocketService } from './services/SocketService';
import { MessageService } from './services/MessageService';

// Controllers
import { WebRTCController } from './controllers/WebRTCController';
import { SocketController } from './controllers/SocketController';
import { SocketMessageController } from './controllers/SocketMessageController';

// Socket and Auth
import { socketAuthMiddleware } from './middleware/socketAuth';
import { setupBasicHandlers } from './socket/handlers/basicHandlers';
import { setupMessageHandlers } from './socket/handlers/messageHandlers';
import { setupWebRTCHandlers } from './socket/handlers/webrtcHandlers';
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    AuthenticatedSocket,
} from '@chat/shared';

// Initialize server and database
let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    logger.info(`Server is running on port ${config.PORT}`);
});

// Initialize core services that don't depend on Socket.IO
const mediaServerClient = new MediaServerClient();
const roomService = new RoomService();
const webrtcService = new WebRTCService(roomService, mediaServerClient);

// Initialize Socket.IO first without controllers
const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
});

// Initialize services that depend on Socket.IO
const socketService = new SocketService(io);
const messageService = new MessageService(io);

// Initialize controllers with all their dependencies
const webrtcController = new WebRTCController(io, roomService, webrtcService);
const socketController = new SocketController(io, socketService);
const socketMessageController = new SocketMessageController(
    io,
    messageService,
    socketService
);

// Setup socket handlers
io.use(socketAuthMiddleware);

io.on('connection', async (socket: AuthenticatedSocket) => {
    if (!socket.data.user) {
        logger.error('Socket connected without user data');
        socket.disconnect();
        return;
    }

    const userId = socket.data.user.id;
    logger.info('Client connected', { socketId: socket.id, userId });

    // Setup connection
    socketController.handleConnection(socket);

    // Setup event handlers
    setupBasicHandlers(socket, socketController);
    setupMessageHandlers(socket, socketMessageController);
    setupWebRTCHandlers(socket, webrtcController);
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
