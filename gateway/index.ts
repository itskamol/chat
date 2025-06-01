/**
 * @file index.ts
 * @description Main entry point for the gateway service
 */
import createApp from './src/app.js';
import { startServer, setupGracefulShutdown } from './src/server/index.js';
import { setupWebSocketUpgrade } from './src/websocket/index.js';

// Create the application
const { app, wsProxy } = createApp();

// Start the server
const server = startServer(app);

// Setup WebSocket upgrade handling
setupWebSocketUpgrade(server, wsProxy);

// Setup graceful shutdown
setupGracefulShutdown(server);
