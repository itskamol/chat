/**
 * @file server.ts
 * @description Main entry point for the Chat Service application.
 * This file initializes the Express application (imported from `app.ts`),
 * connects to MongoDB, starts the HTTP server, and sets up the Socket.IO server
 * for real-time communication. It also initializes and wires up various services
 * and controllers related to chat, WebRTC, and notifications.
 */
import { Server } from 'http'; // Node.js HTTP server
import { Server as SocketIOServer } from 'socket.io'; // Socket.IO server
import app from './app'; // The configured Express application
import config from './config/config'; // Application configuration
import { logger } from './utils'; // Logger utility
import { connectDB } from './database'; // MongoDB connection utility
import { socketAuthMiddleware } from './middleware/socketAuth'; // Authentication middleware for Socket.IO

// Import application services
import { MediaServerClient } from './services/MediaServerClient'; // Client for Media Server
import { RoomService } from './services/RoomService'; // Manages WebRTC rooms
import { WebRTCService } from './services/WebRTCService'; // Handles WebRTC signaling logic
import { SocketService } from './services/SocketService'; // Manages socket connections and user presence
import { MessageService } from './services/MessageService'; // Handles chat message logic

// Import application controllers (primarily for Socket.IO event handling)
import { WebRTCController } from './controllers/WebRTCController'; // Controller for WebRTC related socket events
import { SocketController } from './controllers/SocketController'; // Controller for general socket events (connect, disconnect, typing)
import { SocketMessageController } from './controllers/SocketMessageController'; // Controller for message related socket events

// Import Socket.IO event and data types
import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    AuthenticatedSocket, // Custom socket type after authentication
} from './types/socket.types';

// Global variable for the HTTP server instance
let server: Server;

// Establish connection to MongoDB
connectDB();

// Start the HTTP server, listening on the port defined in the configuration.
// The Express app instance (from app.ts) handles HTTP requests.
server = app.listen(config.PORT, () => {
    logger.info(`Chat Service HTTP server is running on port ${config.PORT}`);
});

// Initialize the Socket.IO server, attaching it to the HTTP server.
// Configures CORS for Socket.IO connections and specifies transport methods.
const io = new SocketIOServer<
    ClientToServerEvents,  // Typed events from client to server
    ServerToClientEvents,  // Typed events from server to client
    InterServerEvents,     // Typed events for server-to-server communication (not used here)
    SocketData             // Typed data associated with each socket (e.g., user info)
>(server, {
    cors: {
        origin: 'http://localhost:3000', // Allowed origin for WebSocket connections (adjust for production)
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'], // Preferred transport methods
});

// Initialize application services, injecting dependencies where needed.
const mediaServerClient = new MediaServerClient(); // Client for interacting with the media server.
const roomService = new RoomService(); // Service for managing WebRTC rooms.
const webrtcService = new WebRTCService(roomService, mediaServerClient); // Core WebRTC signaling service.
const socketService = new SocketService(io); // Service for managing socket connections and online users.
const messageService = new MessageService(io); // Service for handling chat messages.

// Initialize controllers for Socket.IO events, injecting services.
const webrtcController = new WebRTCController(io, roomService, webrtcService);
const socketController = new SocketController(io, socketService);
const socketMessageController = new SocketMessageController(io, messageService, socketService);

// Apply global authentication middleware to all incoming Socket.IO connections.
// This middleware is expected to populate `socket.data.user` if authentication is successful.
io.use(socketAuthMiddleware);

// Define event handlers for new Socket.IO connections.
io.on('connection', async (socket: AuthenticatedSocket) => {
    // Log new client connection, including authenticated user ID if available.
    logger.info('Client connected to Chat Service via Socket.IO', {
        socketId: socket.id, // Unique ID for this socket connection
        userId: socket.data.user?.id, // User ID from authenticated socket data
    });

    // Ensure the socket has user data (populated by socketAuthMiddleware).
    // If not, log an error and disconnect the socket.
    if (!socket.data.user) {
        logger.error('Socket connected without user data after auth middleware. Disconnecting.', { socketId: socket.id });
        socket.disconnect(true); // true for server-initiated disconnect
        return;
    }

    const userId = socket.data.user.id; // Convenience variable for the authenticated user's ID.

    // Register a generic error handler for this specific socket.
    // Catches errors emitted by this socket's event handlers.
    socket.on('error', (error) => {
        logger.error('Socket error on server side:', { socketId: socket.id, userId, error });
        // Optionally, emit an error event back to this client.
        socket.emit('error', { message: 'An internal server error occurred.' });
    });

    // Handle client disconnection.
    socket.on('disconnect', () => {
        socketController.handleDisconnect(socket); // Delegates to SocketController for cleanup.
    });

    // --- Register Handlers for Client-to-Server Socket Events ---

    // Basic presence and typing events
    socket.on('getOnlineUsers', () => {
        socketController.handleGetOnlineUsers(socket);
    });
    socket.on('typing', (data) => {
        socketController.handleTyping(socket, { ...data, senderId: userId });
    });

    // Chat Message Events
    socket.on('sendMessage', (data) => {
        // Note: File uploads are handled via HTTP POST to /upload, not directly via Socket.IO.
        // This 'sendMessage' event is for text messages or for broadcasting messages
        // after a file upload has been processed by the HTTP endpoint.
        socketMessageController.handleSendMessage(socket, {
            senderId: userId,
            message: data.content, // Assuming 'content' for text messages
            receiverId: data.receiverId,
            messageType: data.messageType, // 'text', or potentially 'image', 'video' if broadcasting after HTTP upload
        });
    });
    // Additional message-related events (getMessages, markMessageAsRead) can be uncommented and implemented
    // if client-side needs to perform these actions via Socket.IO. Currently, these might be HTTP/REST.
    // socket.on('getMessages', (data) => { /* ... */ });
    // socket.on('markMessageAsRead', (data) => { /* ... */ });

    // WebRTC Signaling Events
    // These events are handled by the WebRTCController to manage WebRTC sessions.
    socket.on('joinRoom', async ({ roomId }, callback) => { // Client requests to join a WebRTC room
        const result = await webrtcController.handleJoinRoom(socket, { roomId }, userId);
        if (callback) callback(result); else logger.warn("joinRoom event had no callback", {socketId: socket.id});
    });
    socket.on('leaveRoom', async ({ roomId }, callback) => { // Client requests to leave a WebRTC room
        const result = await webrtcController.handleLeaveRoom(socket, { roomId }, userId);
        if (callback) callback(result); else logger.warn("leaveRoom event had no callback", {socketId: socket.id});
    });
    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => { // Client requests router RTP capabilities for a room
        const result = await webrtcController.handleGetRtpCapabilities(socket, { roomId }, userId);
        if (callback) callback(result); else logger.warn("getRouterRtpCapabilities event had no callback", {socketId: socket.id});
    });
    socket.on('createWebRtcTransport', async ({ roomId, producing, consuming, sctpCapabilities }, callback) => { // Client requests to create a WebRTC transport
        const result = await webrtcController.handleCreateTransport(socket, { roomId, producing, consuming, sctpCapabilities }, userId);
        if (callback) callback(result); else logger.warn("createWebRtcTransport event had no callback", {socketId: socket.id});
    });
    socket.on('connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }, callback) => { // Client signals to connect a WebRTC transport
        const result = await webrtcController.handleConnectTransport(socket, { roomId, transportId, dtlsParameters }, userId);
        if (callback) callback(result); else logger.warn("connectWebRtcTransport event had no callback", {socketId: socket.id});
    });
    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => { // Client signals to start producing media
        const result = await webrtcController.handleProduce(socket, { roomId, transportId, kind, rtpParameters, appData }, userId);
        if (callback) callback(result); else logger.warn("produce event had no callback", {socketId: socket.id});
    });
    socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => { // Client signals to start consuming media from a producer
        const result = await webrtcController.handleConsume(socket, { roomId, transportId, producerId, rtpCapabilities }, userId);
        if (callback) callback(result); else logger.warn("consume event had no callback", {socketId: socket.id});
    });
    socket.on('startScreenShare', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => { // Client signals to start screen sharing
        const result = await webrtcController.handleScreenShare(socket, { roomId, transportId, kind, rtpParameters, appData }, userId);
        if (callback) callback(result); else logger.warn("startScreenShare event had no callback", {socketId: socket.id});
    });
    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => { // Client signals to stop screen sharing
        const result = await webrtcController.handleStopScreenShare(socket, { roomId, producerId }, userId);
        if (callback) callback(result); else logger.warn("stopScreenShare event had no callback", {socketId: socket.id});
    });
});

// Graceful shutdown logic
// Handles process termination signals to ensure the server closes connections properly.
const exitHandler = () => {
    if (server) {
        server.close(() => { // Close the HTTP server
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
