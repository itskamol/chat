import express, { RequestHandler } from 'express';
import { RoomManager } from '../lib/roomManager';
import { WorkerManager } from '../lib/workerManager';
import { RoomController } from '../controllers/roomController';

export function createRoomRoutes(roomManager: RoomManager, workerManager: WorkerManager): express.Router {
    const router = express.Router();
    const roomController = new RoomController(roomManager, workerManager);

    // Health check
    router.get('/health', (roomController.getHealth as RequestHandler).bind(roomController));

    // Get router RTP capabilities
    router.get('/rooms/:roomId/router-rtp-capabilities', (roomController.getRtpCapabilities as RequestHandler).bind(roomController));

    // Create WebRTC transport
    router.post('/rooms/:roomId/transports', (roomController.createTransport as RequestHandler).bind(roomController));

    // Connect transport
    router.post('/rooms/:roomId/transports/:transportId/connect', (roomController.connectTransport as RequestHandler).bind(roomController));

    // Create producer
    router.post('/rooms/:roomId/transports/:transportId/produce', (roomController.createProducer as RequestHandler).bind(roomController));

    // Create consumer
    router.post('/rooms/:roomId/transports/:transportId/consume', (roomController.createConsumer as RequestHandler).bind(roomController));

    // Close producer
    router.delete('/rooms/:roomId/producers/:producerId', (roomController.closeProducer as RequestHandler).bind(roomController));

    // Close transport
    router.delete('/rooms/:roomId/transports/:transportId', (roomController.closeTransport as RequestHandler).bind(roomController));

    return router;
}
