/**
 * @file server/index.ts
 * @description Server setup and lifecycle management
 */
import { Application } from 'express';
import { Server } from 'http';
import { config, serviceUrls } from '../config/index.js';

export const startServer = (app: Application): Server => {
    const server = app.listen(config.port, () => {
        console.log(`Gateway is running on port ${config.port}`);
    });

    return server;
};

export const setupGracefulShutdown = (server: Server): void => {
    const exitHandler = (signal: string) => {
        console.log(`Received ${signal}. Shutting down gracefully...`);

        if (server) {
            server.close(() => {
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };

    const unexpectedErrorHandler = (error: unknown) => {
        exitHandler('UNEXPECTED_ERROR');
    };

    // Handle different termination signals
    process.on('SIGTERM', () => exitHandler('SIGTERM'));
    process.on('SIGINT', () => exitHandler('SIGINT'));

    // Handle unexpected errors
    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);
};
