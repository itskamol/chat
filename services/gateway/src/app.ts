/**
 * @file app.ts
 * @description Main application setup - combines all modules
 */
import express, { Application } from 'express';
import { validateConfig } from './config/index.js';
import { setupMiddleware, setupLogging } from './middleware/index.js';
import { setupServiceProxies } from './proxy/index.js';
import { setupWebSocketProxy } from './websocket/index.js';
import { setupHealthCheck } from './health/index.js';

export const createApp = (): { app: Application; wsProxy: any } => {
    // Validate configuration before starting
    validateConfig();

    // Create Express application
    const app: Application = express();

    // Setup middleware
    setupMiddleware(app);

    // Setup service proxies
    setupServiceProxies(app);

    // Setup WebSocket proxy
    const wsProxy = setupWebSocketProxy(app);

    // Setup health check endpoint
    setupHealthCheck(app);

    // Setup logging middleware (after routes to avoid duplicate logs)
    setupLogging(app);

    return { app, wsProxy };
};

export default createApp;
