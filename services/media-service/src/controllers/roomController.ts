import { Request, Response, RequestHandler } from 'express';
import {
    getOrCreateRoom,
    createWebRtcTransport,
    connectTransport,
    createProducer,
    createConsumer,
    closeProducer,
    closeTransport,
    getRoom,
    getRooms,
    getWorker
} from '../services/mediaService';
import { DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';
import { logger } from '../utils/logger';

export const getHealth = (req: Request, res: Response) => {
    const worker = getWorker();
    const currentRooms = getRooms();
    res.status(200).send({
        status: 'OK',
        worker_pid: worker?.pid,
        rooms: currentRooms.size,
    });
};

export const getRouterRtpCapabilities = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    try {
        const room = await getOrCreateRoom(roomId);
        res.status(200).json(room.router.rtpCapabilities);
    } catch (error: any) {
        logger.error(`Error getting router RTP capabilities for room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to get router RTP capabilities',
        });
    }
};

export const createTransportHandler: RequestHandler = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    try {
        const transport = await createWebRtcTransport(roomId);
        res.status(201).json({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters,
        });
    } catch (error: any) {
        logger.error(`Error creating transport for room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create transport',
        });
    }
};

export const connectTransportHandler: RequestHandler = async (req, res) => {
    const { roomId, transportId } = req.params;
    const { dtlsParameters } = req.body as { dtlsParameters: DtlsParameters };
    try {
        const room = getRoom(roomId);
        if (!room) {
            res.status(404).json({ error: `Room ${roomId} not found` });
            return;
        }
        const transport = room.transports.get(transportId);
        if (!transport) {
            res.status(404).json({ error: `Transport ${transportId} not found in room ${roomId}` });
            return;
        }
        await connectTransport(roomId, transportId, dtlsParameters);
        res.status(200).json({ connected: true });
    } catch (error: any) {
        logger.error(`Error connecting transport ${transportId} in room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to connect transport',
        });
    }
};

export const produceHandler: RequestHandler = async (req, res) => {
    const { roomId, transportId } = req.params;
    const { kind, rtpParameters, appData } = req.body as {
        kind: 'audio' | 'video';
        rtpParameters: RtpParameters;
        appData?: any;
    };
    try {
        const room = getRoom(roomId);
        if (!room) {
            res.status(404).json({ error: `Room ${roomId} not found` });
            return;
        }

        const transport = room.transports.get(transportId);
        if (!transport) {
            res.status(404).json({ error: `Transport ${transportId} not found` });
            return;
        }

        const producer = await createProducer(roomId, transportId, kind, rtpParameters, appData);
        res.status(201).json({ id: producer.id });
    } catch (error: any) {
        logger.error(`Error producing on transport ${transportId} in room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || `Failed to produce ${kind}`,
        });
    }
};

export const consumeHandler: RequestHandler = async (req, res) => {
    const { roomId, transportId } = req.params;
    const { producerId, rtpCapabilities } = req.body as {
        producerId: string;
        rtpCapabilities: RtpCapabilities;
    };
    try {
        const room = getRoom(roomId);
        if (!room) {
            res.status(404).json({ error: `Room ${roomId} not found` });
            return; 
        }
        const transport = room.transports.get(transportId);
        if (!transport) {
            res.status(404).json({ error: `Transport ${transportId} not found` });
            return;
        }
        
        const consumer = await createConsumer(roomId, transportId, producerId, rtpCapabilities);
        res.status(201).json({
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            appData: consumer.appData,
        });
    } catch (error: any) {
        logger.error(`Error consuming producer ${producerId} on transport ${transportId} in room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to create consumer',
        });
    }
};

export const closeProducerHandler: RequestHandler = async (req, res) => {
    const { roomId, producerId } = req.params;
    try {
        const room = getRoom(roomId);
        if (!room) {
            res.status(404).json({ error: `Room ${roomId} not found` });
            return;
        }
        const producer = room.producers.get(producerId);
        if (!producer) {
            res.status(404).json({ error: `Producer ${producerId} not found` });
            return;
        }

        closeProducer(roomId, producerId);
        res.status(200).json({ closed: true });
    } catch (error: any) {
        logger.error(`Error closing producer ${producerId} in room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to close producer',
        });
    }
};

export const closeTransportHandler: RequestHandler = async (req, res) => {
    const { roomId, transportId } = req.params;
    try {
        const room = getRoom(roomId);
        if (!room) {
            res.status(404).json({ error: `Room ${roomId} not found` });
            return;
        }
        const transport = room.transports.get(transportId);
        if (!transport) {
            res.status(404).json({ error: `Transport ${transportId} not found` });
            return;
        }

        closeTransport(roomId, transportId);
        res.status(200).json({ closed: true });
    } catch (error: any) {
        logger.error(`Error closing transport ${transportId} in room ${roomId}:`, error);
        res.status(500).json({
            error: error.message || 'Failed to close transport',
        });
    }
};
