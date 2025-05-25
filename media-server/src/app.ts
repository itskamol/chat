import express, { Request, Response, NextFunction } from 'express';
import * as mediasoup from 'mediasoup';
import { Worker } from 'mediasoup/node/lib/Worker';
import { Router, DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/Router'; // Import specific types
import { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransport';
import { Producer } from 'mediasoup/node/lib/Producer';
import { Consumer } from 'mediasoup/node/lib/Consumer';
import winston from 'winston';
import { config as appConfig } from './config'; // Ensure this path is correct

// Basic logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const port = appConfig.server.port;

let worker: Worker;

// Room management
interface Room {
  id: string;
  router: Router;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}
const rooms = new Map<string, Room>();

async function startMediasoupWorker() {
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

async function getOrCreateRoom(roomId: string): Promise<Room> {
  let room = rooms.get(roomId);
  if (!room) {
    if (!worker) {
      logger.error('Worker not initialized yet!');
      throw new Error('Mediasoup worker not initialized');
    }
    const router = await worker.createRouter({ mediaCodecs: appConfig.mediasoup.router.mediaCodecs });
    logger.info(`Router created for room ${roomId} with id ${router.id}`);
    room = { id: roomId, router, transports: new Map(), producers: new Map(), consumers: new Map() };
    rooms.set(roomId, room);
  }
  return room;
}

// API Endpoints

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'OK', worker_pid: worker?.pid, rooms: rooms.size });
});

// GET /rooms/:roomId/router-rtp-capabilities
app.get('/rooms/:roomId/router-rtp-capabilities', async (req: Request, res: Response) => {
  const { roomId } = req.params;
  try {
    const room = await getOrCreateRoom(roomId);
    res.status(200).json(room.router.rtpCapabilities);
  } catch (error: any) {
    logger.error(`Error getting router RTP capabilities for room ${roomId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to get router RTP capabilities' });
  }
});

// POST /rooms/:roomId/transports
app.post('/rooms/:roomId/transports', async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { producing, consuming, sctpCapabilities } = req.body;

  try {
    const room = await getOrCreateRoom(roomId);
    const transport = await room.router.createWebRtcTransport({
      listenIps: appConfig.mediasoup.webRtcTransport.listenIps,
      enableUdp: appConfig.mediasoup.webRtcTransport.enableUdp,
      enableTcp: appConfig.mediasoup.webRtcTransport.enableTcp,
      preferUdp: appConfig.mediasoup.webRtcTransport.preferUdp,
      initialAvailableOutgoingBitrate: appConfig.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      sctpCapabilities: sctpCapabilities, // Optional
    });
    room.transports.set(transport.id, transport);
    logger.info(`Transport created for room ${roomId} with id ${transport.id}`);
    
    // Close transport on router close (e.g. room cleanup)
    transport.on('routerclose', () => {
        logger.info(`Transport ${transport.id} in room ${roomId} closed due to router close.`);
        room.transports.delete(transport.id);
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
    res.status(500).json({ error: error.message || 'Failed to create transport' });
  }
});

// POST /rooms/:roomId/transports/:transportId/connect
app.post('/rooms/:roomId/transports/:transportId/connect', async (req: Request, res: Response) => {
  const { roomId, transportId } = req.params;
  const { dtlsParameters } = req.body as { dtlsParameters: DtlsParameters };

  try {
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: `Room ${roomId} not found` });
    }
    const transport = room.transports.get(transportId);
    if (!transport) {
      return res.status(404).json({ error: `Transport ${transportId} not found in room ${roomId}` });
    }

    await transport.connect({ dtlsParameters });
    logger.info(`Transport ${transportId} connected in room ${roomId}`);
    res.status(200).json({ connected: true });
  } catch (error: any) {
    logger.error(`Error connecting transport ${transportId} in room ${roomId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to connect transport' });
  }
});

// POST /rooms/:roomId/transports/:transportId/produce
app.post('/rooms/:roomId/transports/:transportId/produce', async (req: Request, res: Response) => {
  const { roomId, transportId } = req.params;
  const { kind, rtpParameters, appData } = req.body as { kind: 'audio' | 'video', rtpParameters: RtpParameters, appData?: any };

  try {
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ error: `Room ${roomId} not found` });
    const transport = room.transports.get(transportId);
    if (!transport) return res.status(404).json({ error: `Transport ${transportId} not found` });

    const producer = await transport.produce({ kind, rtpParameters, appData });
    room.producers.set(producer.id, producer);
    logger.info(`Producer created for transport ${transportId} in room ${roomId}: ${producer.id} (${kind})`);

    producer.on('transportclose', () => {
        logger.info(`Producer ${producer.id} closed due to transport close.`);
        room.producers.delete(producer.id);
    });
    producer.on('close', () => { // Ensure it's removed if closed directly
        logger.info(`Producer ${producer.id} was closed directly.`);
        room.producers.delete(producer.id);
    });


    res.status(201).json({ id: producer.id });
  } catch (error: any) {
    logger.error(`Error producing on transport ${transportId} in room ${roomId}:`, error);
    res.status(500).json({ error: error.message || `Failed to produce ${kind}` });
  }
});

// POST /rooms/:roomId/transports/:transportId/consume
app.post('/rooms/:roomId/transports/:transportId/consume', async (req: Request, res: Response) => {
  const { roomId, transportId } = req.params;
  const { producerId, rtpCapabilities } = req.body as { producerId: string, rtpCapabilities: RtpCapabilities };

  try {
    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ error: `Room ${roomId} not found` });
    const transport = room.transports.get(transportId);
    if (!transport) return res.status(404).json({ error: `Transport ${transportId} not found` });
    
    const targetProducer = room.producers.get(producerId);
    if (!targetProducer) return res.status(404).json({ error: `Producer ${producerId} not found`});
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return res.status(400).json({ error: 'Router cannot consume this producer with the provided RTP capabilities' });
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, client should resume
    });
    room.consumers.set(consumer.id, consumer);
    logger.info(`Consumer created for producer ${producerId} on transport ${transportId} in room ${roomId}: ${consumer.id}`);
    
    consumer.on('transportclose', () => {
        logger.info(`Consumer ${consumer.id} closed due to transport close.`);
        room.consumers.delete(consumer.id);
    });
    consumer.on('producerclose', () => {
        logger.info(`Consumer ${consumer.id} closed due to producer ${producerId} close.`);
        room.consumers.delete(consumer.id);
        // Optionally notify client that this consumer's producer closed
    });
     consumer.on('close', () => { // Ensure it's removed if closed directly
        logger.info(`Consumer ${consumer.id} was closed directly.`);
        room.consumers.delete(consumer.id);
    });


    res.status(201).json({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: consumer.appData, // Include appData if it was set on producer and propagated
    });
  } catch (error: any) {
    logger.error(`Error consuming producer ${producerId} on transport ${transportId} in room ${roomId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to create consumer' });
  }
});


// DELETE /rooms/:roomId/producers/:producerId (for explicit cleanup by chat-service)
app.delete('/rooms/:roomId/producers/:producerId', async (req: Request, res: Response) => {
    const { roomId, producerId } = req.params;
    try {
        const room = rooms.get(roomId);
        if (!room) return res.status(404).json({ error: `Room ${roomId} not found` });
        const producer = room.producers.get(producerId);
        if (!producer) return res.status(404).json({ error: `Producer ${producerId} not found` });

        producer.close(); // This will trigger 'close' event on producer, removing it from map
        // Consumers associated with this producer will also receive 'producerclose' event
        logger.info(`Producer ${producerId} in room ${roomId} explicitly closed via API.`);
        res.status(200).json({ closed: true });
    } catch (error: any) {
        logger.error(`Error closing producer ${producerId} in room ${roomId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to close producer' });
    }
});

// DELETE /rooms/:roomId/transports/:transportId (for explicit cleanup by chat-service)
app.delete('/rooms/:roomId/transports/:transportId', async (req: Request, res: Response) => {
    const { roomId, transportId } = req.params;
    try {
        const room = rooms.get(roomId);
        if (!room) return res.status(404).json({ error: `Room ${roomId} not found` });
        const transport = room.transports.get(transportId);
        if (!transport) return res.status(404).json({ error: `Transport ${transportId} not found` });

        transport.close(); // This will trigger 'routerclose' or 'close' on transport, removing it
        // Producers and Consumers on this transport will also be closed.
        logger.info(`Transport ${transportId} in room ${roomId} explicitly closed via API.`);
        res.status(200).json({ closed: true });
    } catch (error: any) {
        logger.error(`Error closing transport ${transportId} in room ${roomId}:`, error);
        res.status(500).json({ error: error.message || 'Failed to close transport' });
    }
});


// Global error handler (optional, for unhandled errors)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


async function main() {
  await startMediasoupWorker(); // Start the worker first

  app.listen(port, () => {
    logger.info(`Media server listening on port ${port}`);
  });
}

main().catch(error => {
  logger.error("Error in main execution:", error);
  process.exit(1);
});
