import { Server } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import fetch from 'node-fetch'; // For making HTTP requests to media-server
import app from './app';
import { Message, connectDB } from './database';
import config from './config/config';
import { logger } from './utils';
import {
    SignalingEvents,
    RoomState,
    ProducerInfo,
    TransportInfo,
    MEDIA_SERVER_API_BASE_URL,
    MediaServerApiEndpoints,
    DtlsParameters,
    RtpCapabilities,
    RtpParameters,
    SctpCapabilities,
    WebRtcTransportParams,
    ConsumerParams,
} from './signaling.types'; // Assuming signaling.types.ts is in the same directory

let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});

// Define stricter types for Socket.IO Server and Socket
interface ServerToClientEvents extends SignalingEvents {
  userStatusChanged: (data: { userId: string; status: 'online' | 'offline'; lastSeen: Date }) => void;
  onlineUsersList: (data: Array<{ userId: string; status: 'online'; lastSeen: Date }>) => void;
  receiveMessage: (data: unknown) => void; // Replace unknown with actual message type
  messageSent: (data: unknown) => void; // Replace unknown with actual message confirmation type
  messageError: (data: { error: string }) => void;
  userTyping: (data: { senderId: string; isTyping: boolean }) => void;
}

interface ClientToServerEvents extends SignalingEvents {
  userOnline: (userId: string) => void;
  sendMessage: (data: { senderId: string; receiverId: string; message: string }) => void;
  getOnlineUsers: () => void;
  typing: (data: { senderId: string; receiverId: string; isTyping: boolean }) => void;
}

interface InterServerEvents {
  // Currently none
}

interface SocketData {
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

// In-memory stores for media signaling
const rooms = new Map<string, RoomState>(); // roomId -> RoomState
const socketToRoomMap = new Map<string, string>(); // socketId -> roomId
const socketToUserIdMap = new Map<string, string>(); // socketId -> userId (for quick lookup)

// Helper function to get or create a room
function getOrCreateRoom(roomId: string): RoomState {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            id: roomId,
            sockets: new Set(),
            users: new Map(), // socketId -> userId
            producers: new Map(), // producerId -> ProducerInfo
        });
        logger.info(`Room ${roomId} created`);
    }
    return rooms.get(roomId)!;
}

// Helper to get user ID from socket (assuming it's stored in socket.data.userId during auth)
// This is a placeholder. Actual auth should happen earlier, e.g., in a middleware.
function getUserIdFromSocket(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): string | undefined {
    return socket.data.userId || socketToUserIdMap.get(socket.id); // Fallback if not in socket.data yet
}


// Online users ni saqlash uchun Map (existing logic)
const onlineUsers = new Map<
    string,
    { socketId: string; userId: string; lastSeen: Date }
>();

io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // User login qilganda (existing logic)
    socket.on('userOnline', (userId: string) => {
        onlineUsers.set(userId, {
            socketId: socket.id,
            userId: userId,
            lastSeen: new Date(),
        });
        socket.data.userId = userId; // Store userId in socket data
        socketToUserIdMap.set(socket.id, userId); // Also in our map for convenience

        socket.broadcast.emit('userStatusChanged', {
            userId: userId,
            status: 'online',
            lastSeen: new Date(),
        });
        logger.info(`User ${userId} is now online`, { socketId: socket.id });

        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user) => ({
                userId: user.userId,
                status: 'online',
                lastSeen: user.lastSeen,
            })
        );
        socket.emit('onlineUsersList', onlineUsersList);
    });

    // User disconnect bo'lganda (modified logic)
    socket.on('disconnect', async () => {
        logger.info('Client disconnected', { socketId: socket.id });
        const userId = getUserIdFromSocket(socket);
        const roomId = socketToRoomMap.get(socket.id);

        if (userId) {
            onlineUsers.delete(userId);
            socketToUserIdMap.delete(socket.id);
            socket.broadcast.emit('userStatusChanged', {
                userId: userId,
                status: 'offline',
                lastSeen: new Date(),
            });
            logger.info(`User ${userId} is now offline`);

            if (roomId) {
                await handleLeaveRoom(socket, roomId, userId, true); // true indicates due to disconnect
            }
        }
    });

    // Message jo'natish (existing logic)
    socket.on('sendMessage', async (data) => {
        try {
            const { senderId, receiverId, message } = data; // Make sure 'data' is typed

            // Messageni bazaga saqlash
            const msg = new Message({ senderId, receiverId, message });
            await msg.save();

            logger.info('Message saved successfully', { messageId: msg._id });

            const receiverInfo = onlineUsers.get(receiverId);
            if (receiverInfo) {
                io.to(receiverInfo.socketId).emit('receiveMessage', { // Type this payload
                    _id: msg._id.toString(),
                    senderId,
                    receiverId,
                    message,
                    createdAt: msg.createdAt,
                });
            }

            socket.emit('messageSent', { // Type this payload
                _id: msg._id.toString(),
                senderId,
                receiverId,
                message,
                createdAt: msg.createdAt,
                delivered: !!receiverInfo,
            });

            logger.debug('Message relayed', {
                messageId: msg._id.toString(),
                delivered: !!receiverInfo,
            });
        } catch (error) {
            logger.error('Error saving message:', error);
            socket.emit('messageError', { error: 'Failed to send message' });
        }
    });

    // Online users listini olish (existing logic)
    socket.on('getOnlineUsers', () => {
        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user) => ({
                userId: user.userId,
                status: 'online',
                lastSeen: user.lastSeen,
            })
        );
        socket.emit('onlineUsersList', onlineUsersList);
    });

    // User typing status (existing logic)
    socket.on('typing', (data) => {
        const receiverInfo = onlineUsers.get(data.receiverId);
        if (receiverInfo) {
            io.to(receiverInfo.socketId).emit('userTyping', {
                senderId: data.senderId,
                isTyping: data.isTyping,
            });
        }
    });

    // --- WebRTC Signaling Handlers ---

    socket.on('joinRoom', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) {
            logger.warn('joinRoom: Unauthenticated user attempt', { socketId: socket.id });
            return callback({ error: 'User not authenticated' });
        }

        try {
            logger.info(`User ${userId} attempting to join room ${roomId}`, { socketId: socket.id });
            const room = getOrCreateRoom(roomId);

            socket.join(roomId);
            room.sockets.add(socket.id);
            room.users.set(socket.id, userId);
            socketToRoomMap.set(socket.id, roomId);
            socket.data.roomId = roomId; // Store roomId in socket data

            // Notify other users in the room
            socket.to(roomId).emit('userJoined', { userId, socketId: socket.id });

            // Prepare list of active producers for the new user
            const activeProducersList = Array.from(room.producers.values()).map(p => ({
                producerId: p.producerId,
                userId: p.userId,
                kind: p.kind,
                appData: p.appData,
            }));

            logger.info(`User ${userId} joined room ${roomId}. Active producers: ${activeProducersList.length}`, { socketId: socket.id });
            callback({ activeProducers: activeProducersList });

        } catch (error) {
            logger.error(`Error in joinRoom for user ${userId}, room ${roomId}:`, error);
            callback({ error: 'Failed to join room' });
        }
    });

    const handleLeaveRoom = async (
        currentSocket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        roomId: string,
        userId: string,
        isDisconnect: boolean = false
    ) => {
        logger.info(`User ${userId} leaving room ${roomId}`, { socketId: currentSocket.id, isDisconnect });
        const room = rooms.get(roomId);
        if (!room) {
            logger.warn(`leaveRoom: Room ${roomId} not found for user ${userId}`);
            return { error: 'Room not found' };
        }

        room.sockets.delete(currentSocket.id);
        room.users.delete(currentSocket.id);
        socketToRoomMap.delete(currentSocket.id);
        currentSocket.data.roomId = undefined;

        // Clean up producers associated with this user
        const userProducers = Array.from(room.producers.values()).filter(p => p.socketId === currentSocket.id);
        for (const producer of userProducers) {
            room.producers.delete(producer.producerId);
            // Notify media-server to close this producer
            try {
                await fetch(MediaServerApiEndpoints.closeProducer(roomId, producer.producerId), { method: 'POST' });
                logger.info(`Requested media-server to close producer ${producer.producerId} for user ${userId} in room ${roomId}`);
            } catch (e) {
                logger.error(`Error notifying media-server to close producer ${producer.producerId}:`, e);
            }
            // Notify other clients in the room that this producer is closed
            io.to(roomId).emit('producerClosed', { producerId: producer.producerId, userId, socketId: currentSocket.id });
        }
        
        // If room is empty, delete it (and potentially tell media-server to clean up router)
        if (room.sockets.size === 0) {
            rooms.delete(roomId);
            // TODO: Consider telling media-server to clean up the room/router if no one is in it after a timeout
            logger.info(`Room ${roomId} is now empty and has been deleted.`);
        } else if (!isDisconnect) {
            // Notify other users in the room only if it's an explicit leave, not a disconnect (disconnect has its own broadcast)
            currentSocket.to(roomId).emit('userLeft', { userId, socketId: currentSocket.id });
        }
        
        currentSocket.leave(roomId);
        logger.info(`User ${userId} left room ${roomId}. Remaining users: ${room.sockets.size}`);
        return {};
    };
    
    socket.on('leaveRoom', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) {
            logger.warn('leaveRoom: Unauthenticated user attempt', { socketId: socket.id });
            if (callback) callback({ error: 'User not authenticated' });
            return;
        }
        const result = await handleLeaveRoom(socket, roomId, userId);
        if (callback) callback(result);
    });


    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        try {
            logger.info(`User ${userId} requesting RouterRtpCapabilities for room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.getRouterRtpCapabilities(roomId));
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to get RouterRtpCapabilities for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const capabilities = await response.json() as RtpCapabilities;
            callback(capabilities);
        } catch (error) {
            logger.error(`Error getting RouterRtpCapabilities for room ${roomId}:`, error);
            callback({ error: 'Failed to get router RTP capabilities' });
        }
    });

    socket.on('createWebRtcTransport', async ({ roomId, producing, consuming, sctpCapabilities }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        try {
            logger.info(`User ${userId} requesting to create WebRTC transport in room ${roomId} (producing: ${producing}, consuming: ${consuming})`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.createTransport(roomId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ producing, consuming, sctpCapabilities }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to create transport for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const transportParams = await response.json() as WebRtcTransportParams;
            
            // Store transport info (simplified, might need more robust management)
            // This is a basic way; ideally, transports are more tightly coupled to the socket/user session on media-server.
            // For chat-service, we primarily care about its existence for signaling.
            logger.info(`Transport ${transportParams.id} created for user ${userId} in room ${roomId}`);
            callback(transportParams);
        } catch (error) {
            logger.error(`Error creating WebRTC transport for room ${roomId}:`, error);
            callback({ error: 'Failed to create WebRTC transport' });
        }
    });

    socket.on('connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        try {
            logger.info(`User ${userId} connecting WebRTC transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.connectTransport(roomId, transportId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dtlsParameters }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to connect transport ${transportId} for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            // Success, media-server handles the connection
            logger.info(`WebRTC transport ${transportId} connected for user ${userId} in room ${roomId}`);
            callback({});
        } catch (error) {
            logger.error(`Error connecting WebRTC transport ${transportId} for room ${roomId}:`, error);
            callback({ error: 'Failed to connect WebRTC transport' });
        }
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = rooms.get(roomId);
        if (!room) return callback({ error: 'Room not found' });

        try {
            logger.info(`User ${userId} producing ${kind} on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.produce(roomId, transportId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, rtpParameters, appData: { ...appData, userId, socketId: socket.id } }), // Pass userId & socketId in appData
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to create producer for transport ${transportId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const { id: producerId } = await response.json() as { id: string };

            const producerInfo: ProducerInfo = {
                producerId,
                userId,
                socketId: socket.id,
                kind,
                rtpParameters, // Store if needed for local reference, though media-server is source of truth
                appData: { ...appData, userId }, // Ensure userId is in appData
                transportId,
            };
            room.producers.set(producerId, producerInfo);

            logger.info(`User ${userId} created producer ${producerId} (${kind}) in room ${roomId}`);
            
            // Notify other users in the room
            socket.to(roomId).emit('newProducer', { producerId, userId, kind, appData: producerInfo.appData, socketId: socket.id });
            
            callback({ producerId });
        } catch (error) {
            logger.error(`Error producing ${kind} for transport ${transportId} in room ${roomId}:`, error);
            callback({ error: `Failed to produce ${kind}` });
        }
    });

    socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = rooms.get(roomId);
        if (!room || !room.producers.has(producerId)) {
            return callback({ error: 'Room or Producer not found' });
        }

        try {
            logger.info(`User ${userId} requesting to consume producer ${producerId} on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.consume(roomId, transportId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ producerId, rtpCapabilities, consumingUserId: userId }), // Send consumingUserId for media-server context
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to create consumer for producer ${producerId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const consumerParams = await response.json() as ConsumerParams;
            
            logger.info(`User ${userId} created consumer ${consumerParams.id} for producer ${producerId} in room ${roomId}`);
            callback(consumerParams); // Send params back to the specific client
        } catch (error) {
            logger.error(`Error consuming producer ${producerId} for transport ${transportId} in room ${roomId}:`, error);
            callback({ error: 'Failed to consume producer' });
        }
    });

    socket.on('startScreenShare', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = rooms.get(roomId);
        if (!room) return callback({ error: 'Room not found' });

        // Ensure appData correctly indicates screen sharing
        const screenAppData = { ...appData, type: 'screen', userId, socketId: socket.id };

        try {
            logger.info(`User ${userId} starting screen share on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.produce(roomId, transportId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, rtpParameters, appData: screenAppData }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to create screen share producer for transport ${transportId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const { id: producerId } = await response.json() as { id: string };

            const producerInfo: ProducerInfo = {
                producerId,
                userId,
                socketId: socket.id,
                kind,
                rtpParameters,
                appData: screenAppData,
                transportId,
            };
            room.producers.set(producerId, producerInfo);
            // Optional: Store this screen producer ID specifically if needed for quick lookup on disconnect for this socket
            // socket.data.screenProducerId = producerId; // Or use a separate map

            logger.info(`User ${userId} created screen share producer ${producerId} in room ${roomId}`);
            
            socket.to(roomId).emit('newProducer', { producerId, userId, kind, appData: screenAppData, socketId: socket.id });
            
            callback({ producerId });
        } catch (error) {
            logger.error(`Error starting screen share for transport ${transportId} in room ${roomId}:`, error);
            callback({ error: `Failed to start screen share` });
        }
    });

    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = rooms.get(roomId);
        if (!room) return callback({ error: 'Room not found' });

        const producerInfo = room.producers.get(producerId);
        if (!producerInfo || producerInfo.userId !== userId || producerInfo.appData?.type !== 'screen') {
            return callback({ error: 'Screen share producer not found or not owned by user' });
        }

        try {
            logger.info(`User ${userId} stopping screen share producer ${producerId} in room ${roomId}`, { socketId: socket.id });
            const response = await fetch(MediaServerApiEndpoints.closeProducer(roomId, producerId), {
                method: 'DELETE', // Assuming DELETE, or POST if your API uses POST for closing
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Media-server failed to close screen share producer ${producerId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }

            room.producers.delete(producerId);
            // if (socket.data.screenProducerId === producerId) {
            //     socket.data.screenProducerId = undefined;
            // }

            logger.info(`User ${userId} stopped screen share producer ${producerId} in room ${roomId}`);
            
            io.to(roomId).emit('producerClosed', { producerId, userId, socketId: socket.id });
            
            callback({});
        } catch (error) {
            logger.error(`Error stopping screen share producer ${producerId} in room ${roomId}:`, error);
            callback({ error: 'Failed to stop screen share' });
        }
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
