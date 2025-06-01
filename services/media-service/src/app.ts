import express, { Request, Response, NextFunction } from 'express';
import { config as appConfig } from './config/config';
import roomRoutes from './routes/roomRoutes'; // Importing room routes
import { logger } from './utils/logger';
import { startMediasoupWorker } from './services/mediaService';

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const port = appConfig.server.port;

// API Endpoints
app.use(roomRoutes);

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

main().catch((error) => {
    logger.error('Error in main execution:', error);
    process.exit(1);
});
