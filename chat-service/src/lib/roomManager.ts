import { Socket, Server as SocketIOServer } from 'socket.io';
import axios from 'axios';
import { logger } from '../utils';
import { RoomState, ProducerInfo, MediaServerApiEndpoints } from '../signaling.types';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../server'; // Adjust path

// In-memory stores for media signaling
const rooms = new Map<string, RoomState>(); // roomId -> RoomState
const socketToRoomMap = new Map<string, string>(); // socketId -> roomId

export class RoomManager {
    private rooms: Map<string, RoomState>;
    private socketToRoomMap: Map<string, string>;

    constructor() {
        this.rooms = new Map<string, RoomState>();
        this.socketToRoomMap = new Map<string, string>();
    }

    getRoom(roomId: string): RoomState | undefined {
        return this.rooms.get(roomId);
    }
    
    getSocketToRoomMap(): Map<string, string> {
        return this.socketToRoomMap;
    }

    setSocketToRoomMap(socketId: string, roomId: string): void {
        this.socketToRoomMap.set(socketId, roomId);
    }

    deleteFromSocketToRoomMap(socketId: string): void {
        this.socketToRoomMap.delete(socketId);
    }
    
    getOrCreateRoom(roomId: string): RoomState {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                sockets: new Set(),
                users: new Map(), // socketId -> userId
                producers: new Map(), // producerId -> ProducerInfo
            });
            logger.info(`Room ${roomId} created`);
        }
        return this.rooms.get(roomId)!;
    }

    addProducer(roomId: string, producerId: string, producerInfo: ProducerInfo): void {
        const room = this.getRoom(roomId);
        if (room) {
            room.producers.set(producerId, producerInfo);
        }
    }

    async removeProducer(
        roomId: string, 
        producerId: string, 
        userId: string, // For logging and event emission
        socketId: string, // For event emission
        io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> // Optional io for emitting
    ): Promise<void> {
        const room = this.getRoom(roomId);
        if (room && room.producers.has(producerId)) {
            room.producers.delete(producerId);
            logger.info(`Producer ${producerId} removed from room ${roomId} by user ${userId}`);
            try {
                // Notify media-server to close this producer
                await axios.post(MediaServerApiEndpoints.closeProducer(roomId, producerId)); // or .delete if API expects that
                logger.info(`Requested media-server to close producer ${producerId} for user ${userId} in room ${roomId}`);
            } catch (e) {
                logger.error(`Error notifying media-server to close producer ${producerId}:`, e);
            }
            // Notify other clients in the room that this producer is closed
            if (io) {
                 io.to(roomId).emit('producerClosed', { producerId, userId, socketId });
            } else {
                // Fallback or direct socket emit if io is not available (e.g. called from a context without io)
                // This part might need adjustment based on how/where removeProducer is called.
                // For now, we assume io is passed when needed for broadcast.
                logger.warn(`Socket.IO server instance not provided to removeProducer for room ${roomId}, producer ${producerId}. Cannot broadcast producerClosed.`);
            }
        }
    }


    async handleLeaveRoom(
        currentSocket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        roomId: string,
        userId: string,
        isDisconnect: boolean = false,
        io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
    ): Promise<{ error?: string }> {
        logger.info(`User ${userId} leaving room ${roomId}`, { socketId: currentSocket.id, isDisconnect });
        const room = this.getRoom(roomId);
        if (!room) {
            logger.warn(`leaveRoom: Room ${roomId} not found for user ${userId}`);
            return { error: 'Room not found' };
        }

        room.sockets.delete(currentSocket.id);
        room.users.delete(currentSocket.id);
        this.deleteFromSocketToRoomMap(currentSocket.id);
        currentSocket.data.roomId = undefined;

        // Clean up producers associated with this user
        const userProducers = Array.from(room.producers.values()).filter(p => p.socketId === currentSocket.id);
        for (const producer of userProducers) {
           await this.removeProducer(roomId, producer.producerId, userId, currentSocket.id, io);
        }
        
        if (room.sockets.size === 0) {
            this.rooms.delete(roomId);
            logger.info(`Room ${roomId} is now empty and has been deleted.`);
            // TODO: Consider telling media-server to clean up the room/router
        } else if (!isDisconnect) {
            currentSocket.to(roomId).emit('userLeft', { userId, socketId: currentSocket.id });
        }
        
        currentSocket.leave(roomId);
        logger.info(`User ${userId} left room ${roomId}. Remaining users: ${room.sockets.size}`);
        return {};
    }
}
