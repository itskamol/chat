import express, { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { logger } from './config/logger';
import { WorkerManager } from './lib/workerManager';
import { RoomManager } from './lib/roomManager';
import { createRoomRoutes } from './routes/roomRoutes';

const app = express();
app.use(express.json());

const port = config.server.port;
const workerManager = new WorkerManager();
const roomManager = new RoomManager();

// Mount routes
app.use('/', createRoomRoutes(roomManager, workerManager));

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

async function main() {
    try {
        // Start mediasoup worker
        await workerManager.start();

        // Start express server
        app.listen(port, () => {
            logger.info(`Media server listening on port ${port}`);
        });
    } catch (error) {
        logger.error('Error in main execution:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    logger.error('Error in main execution:', error);
    process.exit(1);
});
