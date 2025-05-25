// WebRTC signaling related socket event handlers
import { Socket, Server as SocketIOServer } from 'socket.io';
import axios from 'axios';
import { logger } from '../utils';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../server'; // Adjust path as needed
import { RoomManager } from '../lib/roomManager';
import { getUserIdFromSocket } from '../lib/userManager'; // Assuming getUserIdFromSocket is moved here or server.ts
import {
    MediaServerApiEndpoints,
    RtpCapabilities,
    WebRtcTransportParams,
    ProducerInfo,
    ConsumerParams,
} from '../signaling.types';

export function registerWebRTCHandlers(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    roomManager: RoomManager
) {
    socket.on('joinRoom', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) {
            logger.warn('joinRoom: Unauthenticated user attempt', { socketId: socket.id });
            return callback({ error: 'User not authenticated' });
        }

        try {
            logger.info(`User ${userId} attempting to join room ${roomId}`, { socketId: socket.id });
            const room = roomManager.getOrCreateRoom(roomId);

            socket.join(roomId);
            room.sockets.add(socket.id);
            room.users.set(socket.id, userId);
            roomManager.setSocketToRoomMap(socket.id, roomId);
            socket.data.roomId = roomId;

            socket.to(roomId).emit('userJoined', { userId, socketId: socket.id });

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

    socket.on('leaveRoom', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) {
            logger.warn('leaveRoom: Unauthenticated user attempt', { socketId: socket.id });
            if (callback) callback({ error: 'User not authenticated' });
            return;
        }
        const result = await roomManager.handleLeaveRoom(socket, roomId, userId, false, io);
        if (callback) callback(result);
    });

    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        try {
            logger.info(`User ${userId} requesting RouterRtpCapabilities for room ${roomId}`, { socketId: socket.id });
            const response = await axios.get(MediaServerApiEndpoints.getRouterRtpCapabilities(roomId));
            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to get RouterRtpCapabilities for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const capabilities = response.data as RtpCapabilities;
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
            const response = await axios.post(MediaServerApiEndpoints.createTransport(roomId), {
                producing, consuming, sctpCapabilities
            }, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to create transport for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const transportParams = response.data as WebRtcTransportParams;
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
            const response = await axios.post(MediaServerApiEndpoints.connectTransport(roomId, transportId), {
                dtlsParameters
            }, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to connect transport ${transportId} for room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
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

        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: 'Room not found' });

        try {
            logger.info(`User ${userId} producing ${kind} on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await axios.post(MediaServerApiEndpoints.produce(roomId, transportId), {
                kind, rtpParameters, appData: { ...appData, userId, socketId: socket.id }
            }, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to create producer for transport ${transportId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const { id: producerId } = response.data as { id: string };

            const producerInfo: ProducerInfo = {
                producerId,
                userId,
                socketId: socket.id,
                kind,
                rtpParameters,
                appData: { ...appData, userId },
                transportId,
            };
            roomManager.addProducer(roomId, producerId, producerInfo);

            logger.info(`User ${userId} created producer ${producerId} (${kind}) in room ${roomId}`);
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

        const room = roomManager.getRoom(roomId);
        if (!room || !room.producers.has(producerId)) {
            return callback({ error: 'Room or Producer not found' });
        }

        try {
            logger.info(`User ${userId} requesting to consume producer ${producerId} on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await axios.post(MediaServerApiEndpoints.consume(roomId, transportId), {
                producerId, rtpCapabilities, consumingUserId: userId
            }, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to create consumer for producer ${producerId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const consumerParams = response.data as ConsumerParams;
            logger.info(`User ${userId} created consumer ${consumerParams.id} for producer ${producerId} in room ${roomId}`);
            callback(consumerParams);
        } catch (error) {
            logger.error(`Error consuming producer ${producerId} for transport ${transportId} in room ${roomId}:`, error);
            callback({ error: 'Failed to consume producer' });
        }
    });

    socket.on('startScreenShare', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: 'Room not found' });

        // Ensure appData correctly indicates screen sharing
        const screenAppData: ProducerInfo['appData'] = { // Use the type from ProducerInfo['appData']
            ...(appData || {}),
            type: 'screen', 
            userId,
            socketId: socket.id
        };

        try {
            logger.info(`User ${userId} starting screen share on transport ${transportId} in room ${roomId}`, { socketId: socket.id });
            const response = await axios.post(MediaServerApiEndpoints.produce(roomId, transportId), {
                kind, rtpParameters, appData: screenAppData // Use the typed object here
            }, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status !== 200) {
                const errorText = response.data;
                logger.error(`Media-server failed to create screen share producer for transport ${transportId} in room ${roomId}: ${response.status} ${errorText}`);
                return callback({ error: `Media server error: ${errorText}` });
            }
            const { id: producerId } = response.data as { id: string };

            const producerInfo: ProducerInfo = {
                producerId,
                userId,
                socketId: socket.id,
                kind,
                rtpParameters,
                appData: screenAppData, // Assign the correctly typed screenAppData
                transportId,
            };
            roomManager.addProducer(roomId, producerId, producerInfo);

            logger.info(`User ${userId} created screen share producer ${producerId} in room ${roomId}`);
            socket.to(roomId).emit('newProducer', { producerId, userId, kind, appData: screenAppData, socketId: socket.id }); // Also use it here
            callback({ producerId });
        } catch (error) {
            logger.error(`Error starting screen share for transport ${transportId} in room ${roomId}:`, error);
            callback({ error: `Failed to start screen share` });
        }
    });

    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => {
        const userId = getUserIdFromSocket(socket);
        if (!userId) return callback({ error: 'User not authenticated' });

        const room = roomManager.getRoom(roomId);
        if (!room) return callback({ error: 'Room not found' });

        const producerInfo = room.producers.get(producerId);
        if (!producerInfo || producerInfo.userId !== userId || producerInfo.appData?.type !== 'screen') {
            return callback({ error: 'Screen share producer not found or not owned by user' });
        }

        try {
            logger.info(`User ${userId} stopping screen share producer ${producerId} in room ${roomId}`, { socketId: socket.id });
            // Assuming roomManager.removeProducer also handles notifying media-server
            await roomManager.removeProducer(roomId, producerId, userId, socket.id, io); // Pass io
            
            // No need to emit 'producerClosed' here if handleLeaveRoom/removeProducer does it
            callback({});
        } catch (error) {
            logger.error(`Error stopping screen share producer ${producerId} in room ${roomId}:`, error);
            callback({ error: 'Failed to stop screen share' });
        }
    });
}
