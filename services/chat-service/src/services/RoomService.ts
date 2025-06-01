import { Socket } from 'socket.io';
import { logger } from '../utils';
import { RoomParticipant, RoomState } from '../types/room.types';
import { ProducerInfo } from '@chat/shared';

export class RoomService {
    private rooms: Map<string, RoomState>;
    private socketToRoomMap: Map<string, string>;

    constructor() {
        this.rooms = new Map();
        this.socketToRoomMap = new Map();
    }

    public getRoom(roomId: string): RoomState | undefined {
        return this.rooms.get(roomId);
    }

    public getOrCreateRoom(roomId: string): RoomState {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                sockets: new Set(),
                users: new Map(),
                producers: new Map(),
                participants: new Map()
            });
            logger.info(`Room ${roomId} created`);
        }
        return this.rooms.get(roomId)!;
    }

    public getRoomIdForSocket(socketId: string): string | undefined {
        return this.socketToRoomMap.get(socketId);
    }

    public joinRoom(socket: Socket, roomId: string, userId: string): void {
        const room = this.getOrCreateRoom(roomId);
        
        socket.join(roomId);
        room.sockets.add(socket.id);
        room.users.set(socket.id, userId);
        this.socketToRoomMap.set(socket.id, roomId);

        // Create or update participant info
        const participant: RoomParticipant = {
            socketId: socket.id,
            userId,
            producers: new Map()
        };
        room.participants.set(socket.id, participant);

        logger.info(`User ${userId} joined room ${roomId}`, { socketId: socket.id });
    }

    public async leaveRoom(socket: Socket, roomId: string, userId: string): Promise<void> {
        const room = this.getRoom(roomId);
        if (!room) {
            logger.warn(`leaveRoom: Room ${roomId} not found for user ${userId}`);
            return;
        }

        // Clean up room state
        room.sockets.delete(socket.id);
        room.users.delete(socket.id);
        room.participants.delete(socket.id);
        this.socketToRoomMap.delete(socket.id);

        // Leave socket.io room
        await socket.leave(roomId);

        // If room is empty, delete it
        if (room.sockets.size === 0) {
            this.rooms.delete(roomId);
            logger.info(`Room ${roomId} is now empty and has been deleted.`);
        }

        logger.info(`User ${userId} left room ${roomId}. Remaining users: ${room.sockets.size}`);
    }

    public addProducer(roomId: string, producerInfo: ProducerInfo): void {
        const room = this.getRoom(roomId);
        if (!room) {
            throw new Error(`Room ${roomId} not found`);
        }

        room.producers.set(producerInfo.producerId, producerInfo);
        
        const participant = room.participants.get(producerInfo.socketId);
        if (participant) {
            participant.producers.set(producerInfo.producerId, producerInfo);
        }
    }

    public removeProducer(roomId: string, producerId: string): ProducerInfo | undefined {
        const room = this.getRoom(roomId);
        if (!room) {
            return undefined;
        }

        const producerInfo = room.producers.get(producerId);
        if (producerInfo) {
            room.producers.delete(producerId);
            
            const participant = room.participants.get(producerInfo.socketId);
            if (participant) {
                participant.producers.delete(producerId);
            }
        }

        return producerInfo;
    }

    public getActiveProducers(roomId: string): ProducerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.producers.values()).map(producer => ({
        producerId: producer.producerId,
        userId: producer.userId, // You need to store this when creating the producer
        kind: producer.kind,
        appData: producer.appData,
        socketId: producer.socketId, // You need to store this when creating the producer
        rtpParameters: producer.rtpParameters,
        transportId: producer.transportId, // You need to store this when creating the producer
    }));
}
}
