import { Request, Response } from 'express';
import { RoomManager } from '../lib/roomManager';
import { WorkerManager } from '../lib/workerManager';
import { logger } from '../config/logger';
import { config } from '../config';
import { DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';

export class RoomController {
    constructor(
        private roomManager: RoomManager,
        private workerManager: WorkerManager
    ) {}

    async getHealth(req: Request, res: Response) {
        const worker = this.workerManager.getWorker();
        res.status(200).send({
            status: 'OK',
            worker_pid: worker?.pid,
            rooms: this.roomManager.getRoomsCount(),
        });
    }

    async getRtpCapabilities(req: Request, res: Response) {
        const { roomId } = req.params;
        try {
            const worker = this.workerManager.getWorker();
            if (!worker) {
                throw new Error('Worker not initialized');
            }

            let room = this.roomManager.get(roomId);
            if (!room) {
                const router = await worker.createRouter({
                    mediaCodecs: config.mediasoup.router.mediaCodecs,
                });
                room = await this.roomManager.createRoom(roomId, router);
            }
            res.status(200).json(room.router.rtpCapabilities);
        } catch (error: any) {
            logger.error(`Error getting router RTP capabilities for room ${roomId}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to get router RTP capabilities',
            });
        }
    }

    async createTransport(req: Request, res: Response) {
        const { roomId } = req.params;
        const { producing, consuming, sctpCapabilities } = req.body;

        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const transport = await room.router.createWebRtcTransport({
                listenIps: config.mediasoup.webRtcTransport.listenIps,
                enableUdp: config.mediasoup.webRtcTransport.enableUdp,
                enableTcp: config.mediasoup.webRtcTransport.enableTcp,
                preferUdp: config.mediasoup.webRtcTransport.preferUdp,
                initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
                enableSctp: Boolean(sctpCapabilities),
                numSctpStreams: sctpCapabilities ? { OS: 1024, MIS: 1024 } : undefined,
            });

            this.roomManager.addTransport(roomId, transport);

            transport.on('routerclose', () => {
                this.roomManager.removeTransport(roomId, transport.id);
            });

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
    }

    async connectTransport(req: Request, res: Response) {
        const { roomId, transportId } = req.params;
        const { dtlsParameters } = req.body as { dtlsParameters: DtlsParameters };

        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: `Room ${roomId} not found` });
            }

            const transport = room.transports.get(transportId);
            if (!transport) {
                return res.status(404).json({ error: `Transport ${transportId} not found` });
            }

            await transport.connect({ dtlsParameters });
            res.status(200).json({ connected: true });
        } catch (error: any) {
            logger.error(`Error connecting transport ${transportId}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to connect transport',
            });
        }
    }

    async createProducer(req: Request, res: Response) {
        const { roomId, transportId } = req.params;
        const { kind, rtpParameters, appData } = req.body as {
            kind: 'audio' | 'video';
            rtpParameters: RtpParameters;
            appData?: any;
        };

        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: `Room ${roomId} not found` });
            }

            const transport = room.transports.get(transportId);
            if (!transport) {
                return res.status(404).json({ error: `Transport ${transportId} not found` });
            }

            const producer = await transport.produce({
                kind,
                rtpParameters,
                appData,
            });

            this.roomManager.addProducer(roomId, producer);

            producer.on('transportclose', () => {
                this.roomManager.removeProducer(roomId, producer.id);
            });

            res.status(201).json({ id: producer.id });
        } catch (error: any) {
            logger.error(`Error producing on transport ${transportId}:`, error);
            res.status(500).json({
                error: error.message || `Failed to produce ${kind}`,
            });
        }
    }

    async createConsumer(req: Request, res: Response) {
        const { roomId, transportId } = req.params;
        const { producerId, rtpCapabilities } = req.body as {
            producerId: string;
            rtpCapabilities: RtpCapabilities;
        };

        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: `Room ${roomId} not found` });
            }

            const transport = room.transports.get(transportId);
            if (!transport) {
                return res.status(404).json({ error: `Transport ${transportId} not found` });
            }

            const producer = room.producers.get(producerId);
            if (!producer) {
                return res.status(404).json({ error: `Producer ${producerId} not found` });
            }

            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                return res.status(400).json({
                    error: 'Router cannot consume this producer with the provided RTP capabilities',
                });
            }

            const consumer = await transport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
            });

            this.roomManager.addConsumer(roomId, consumer);

            consumer.on('transportclose', () => {
                this.roomManager.removeConsumer(roomId, consumer.id);
            });

            consumer.on('producerclose', () => {
                this.roomManager.removeConsumer(roomId, consumer.id);
            });

            res.status(201).json({
                id: consumer.id,
                producerId: consumer.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                appData: consumer.appData,
            });
        } catch (error: any) {
            logger.error(`Error consuming producer ${producerId}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to create consumer',
            });
        }
    }

    async closeProducer(req: Request, res: Response) {
        const { roomId, producerId } = req.params;
        
        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: `Room ${roomId} not found` });
            }

            const producer = room.producers.get(producerId);
            if (!producer) {
                return res.status(404).json({ error: `Producer ${producerId} not found` });
            }

            producer.close();
            this.roomManager.removeProducer(roomId, producerId);
            res.status(200).json({ closed: true });
        } catch (error: any) {
            logger.error(`Error closing producer ${producerId}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to close producer',
            });
        }
    }

    async closeTransport(req: Request, res: Response) {
        const { roomId, transportId } = req.params;

        try {
            const room = this.roomManager.get(roomId);
            if (!room) {
                return res.status(404).json({ error: `Room ${roomId} not found` });
            }

            const transport = room.transports.get(transportId);
            if (!transport) {
                return res.status(404).json({ error: `Transport ${transportId} not found` });
            }

            transport.close();
            this.roomManager.removeTransport(roomId, transportId);
            res.status(200).json({ closed: true });
        } catch (error: any) {
            logger.error(`Error closing transport ${transportId}:`, error);
            res.status(500).json({
                error: error.message || 'Failed to close transport',
            });
        }
    }
}
