import express from 'express';
import {
    getHealth,
    getRouterRtpCapabilities,
    createTransportHandler,
    connectTransportHandler,
    produceHandler,
    consumeHandler,
    closeProducerHandler,
    closeTransportHandler,
} from '../controllers/roomController';

const router = express.Router();

// Health check
router.get('/health', getHealth);

// Room and Router specific
router.get('/rooms/:roomId/router-rtp-capabilities', getRouterRtpCapabilities);

// Transport specific
router.post('/rooms/:roomId/transports', createTransportHandler);
router.post('/rooms/:roomId/transports/:transportId/connect', connectTransportHandler);
router.delete('/rooms/:roomId/transports/:transportId', closeTransportHandler);

// Producer specific
router.post('/rooms/:roomId/transports/:transportId/produce', produceHandler);
router.delete('/rooms/:roomId/producers/:producerId', closeProducerHandler);

// Consumer specific
router.post('/rooms/:roomId/transports/:transportId/consume', consumeHandler);

export default router;
