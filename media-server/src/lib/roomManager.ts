import {
    Router,
    WebRtcTransport,
    Producer,
    Consumer
} from 'mediasoup/node/lib/types';
import { logger } from '../config/logger';

// Room management
export interface Room {
    id: string;
    router: Router;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}

export class RoomManager {
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    get(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    async createRoom(roomId: string, router: Router): Promise<Room> {
        const room: Room = {
            id: roomId,
            router,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        };
        this.rooms.set(roomId, room);
        logger.info(`Room ${roomId} created with router ${router.id}`);
        return room;
    }

    deleteRoom(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            this.rooms.delete(roomId);
            logger.info(`Room ${roomId} deleted`);
        }
    }

    addTransport(roomId: string, transport: WebRtcTransport) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.transports.set(transport.id, transport);
            logger.info(`Transport ${transport.id} added to room ${roomId}`);
        }
    }

    addProducer(roomId: string, producer: Producer) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.producers.set(producer.id, producer);
            logger.info(`Producer ${producer.id} added to room ${roomId}`);
        }
    }

    addConsumer(roomId: string, consumer: Consumer) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.consumers.set(consumer.id, consumer);
            logger.info(`Consumer ${consumer.id} added to room ${roomId}`);
        }
    }

    removeTransport(roomId: string, transportId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.transports.delete(transportId);
            logger.info(`Transport ${transportId} removed from room ${roomId}`);
        }
    }

    removeProducer(roomId: string, producerId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.producers.delete(producerId);
            logger.info(`Producer ${producerId} removed from room ${roomId}`);
        }
    }

    removeConsumer(roomId: string, consumerId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.consumers.delete(consumerId);
            logger.info(`Consumer ${consumerId} removed from room ${roomId}`);
        }
    }

    getRoomsCount(): number {
        return this.rooms.size;
    }
}
