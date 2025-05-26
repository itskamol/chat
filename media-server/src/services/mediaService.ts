import * as mediasoup from 'mediasoup';
import {
    Worker,
    Router,
    WebRtcTransport,
    Producer,
    Consumer,
    DtlsParameters,
    RtpCapabilities,
    RtpParameters,
} from 'mediasoup/node/lib/types';
import { config as appConfig } from '../config';
import { logger } from '../utils/logger'; // Assuming logger is in utils

export interface Room {
    id: string;
    router: Router;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}

let worker: Worker;
const rooms = new Map<string, Room>();

export async function startMediasoupWorker(): Promise<void> {
    try {
        worker = await mediasoup.createWorker({
            logLevel: appConfig.mediasoup.worker.logLevel,
            logTags: appConfig.mediasoup.worker.logTags,
            rtcMinPort: appConfig.mediasoup.worker.rtcMinPort,
            rtcMaxPort: appConfig.mediasoup.worker.rtcMaxPort,
        });
        logger.info('Mediasoup worker created successfully');

        worker.on('died', (error) => {
            logger.error('Mediasoup worker has died:', error);
            process.exit(1); // Exit process if worker dies
        });
    } catch (error) {
        logger.error('Error starting mediasoup worker:', error);
        process.exit(1);
    }
}

export function getWorker(): Worker | undefined {
    return worker;
}

export async function getOrCreateRoom(roomId: string): Promise<Room> {
    let room = rooms.get(roomId);
    if (!room) {
        if (!worker) {
            logger.error('Worker not initialized yet!');
            throw new Error('Mediasoup worker not initialized');
        }
        const router = await worker.createRouter({
            mediaCodecs: appConfig.mediasoup.router.mediaCodecs,
        });
        logger.info(`Router created for room ${roomId} with id ${router.id}`);
        room = {
            id: roomId,
            router,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        };
        rooms.set(roomId, room);
    }
    return room;
}

export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
}

export function getRooms(): Map<string, Room> {
    return rooms;
}

export async function createWebRtcTransport(
    roomId: string
): Promise<WebRtcTransport> {
    const room = await getOrCreateRoom(roomId);
    const transport = await room.router.createWebRtcTransport({
        listenIps: appConfig.mediasoup.webRtcTransport.listenInfos,
        enableUdp: appConfig.mediasoup.webRtcTransport.enableUdp,
        enableTcp: appConfig.mediasoup.webRtcTransport.enableTcp,
        preferUdp: appConfig.mediasoup.webRtcTransport.preferUdp,
        initialAvailableOutgoingBitrate:
            appConfig.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
    });
    room.transports.set(transport.id, transport);
    logger.info(`Transport created for room ${roomId} with id ${transport.id}`);

    transport.on('routerclose', () => {
        logger.info(
            `Transport ${transport.id} in room ${roomId} closed due to router close.`
        );
        room.transports.delete(transport.id);
    });
    return transport;
}

export async function connectTransport(
    roomId: string,
    transportId: string,
    dtlsParameters: DtlsParameters
): Promise<void> {
    const room = rooms.get(roomId);
    if (!room) {
        throw new Error(`Room ${roomId} not found`);
    }
    const transport = room.transports.get(transportId);
    if (!transport) {
        throw new Error(`Transport ${transportId} not found in room ${roomId}`);
    }
    await transport.connect({ dtlsParameters });
    logger.info(`Transport ${transportId} connected in room ${roomId}`);
}

export async function createProducer(
    roomId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
    appData?: any
): Promise<Producer> {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    const transport = room.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const producer = await transport.produce({ kind, rtpParameters, appData });
    room.producers.set(producer.id, producer);
    logger.info(
        `Producer created for transport ${transportId} in room ${roomId}: ${producer.id} (${kind})`
    );

    producer.on('transportclose', () => {
        logger.info(`Producer ${producer.id} closed due to transport close.`);
        room.producers.delete(producer.id);
    });
    producer.on('@close', () => {
        logger.info(`Producer ${producer.id} was closed directly.`);
        room.producers.delete(producer.id);
    });
    return producer;
}

export async function createConsumer(
    roomId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
): Promise<Consumer> {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const transport = room.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const targetProducer = room.producers.get(producerId);
    if (!targetProducer) throw new Error(`Producer ${producerId} not found`);

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error(
            'Router cannot consume this producer with the provided RTP capabilities'
        );
    }

    try {
        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true, // Start paused, client should resume
        });
        room.consumers.set(consumer.id, consumer);
        logger.info(
            `Consumer created for producer ${producerId} on transport ${transportId} in room ${roomId}: ${consumer.id}`
        );

        consumer.on('transportclose', () => {
            logger.info(
                `Consumer ${consumer.id} closed due to transport close.`
            );
            room.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            logger.info(
                `Consumer ${consumer.id} closed due to producer ${producerId} close.`
            );
            room.consumers.delete(consumer.id);
        });

        return consumer;
    } catch (error) {
        logger.error(
            `Error creating consumer for producer ${producerId} on transport ${transportId} in room ${roomId}:`,
            error
        );
        throw new Error('Failed to create consumer');
    }
}

export function closeProducer(roomId: string, producerId: string): void {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    const producer = room.producers.get(producerId);
    if (!producer) throw new Error(`Producer ${producerId} not found`);
    producer.close();
    logger.info(`Producer ${producerId} in room ${roomId} explicitly closed.`);
}

export function closeTransport(roomId: string, transportId: string): void {
    const room = rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    const transport = room.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    transport.close();
    logger.info(
        `Transport ${transportId} in room ${roomId} explicitly closed.`
    );
}
