/**
 * @file index.ts
 * @description Main entry point for the File Service application.
 * This file initializes the Express application, sets up middleware,
 * mounts routes, and starts the HTTP server.
 * Configuration is loaded from './config/config' which sources from environment variables.
 */
import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/config'; // Application configuration
import fileRoutes from './routes/fileRoutes'; // Routes for file operations
import { errorHandler } from './middlewares/errorHandler'; // Global error handling middleware
import { loggingMiddleware } from './middlewares/loggingMiddleware'; // Request logging middleware

// Initialize the Express application
const app = express();

// Apply global request logging middleware (should be one of the first)
app.use(loggingMiddleware);

// Standard middleware for parsing request bodies
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

/**
 * @route GET /health
 * @description Provides a simple health check endpoint for monitoring service status.
 * Returns a JSON response indicating the service is 'ok'.
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'file-service', timestamp: new Date().toISOString() });
});

// Mount the API routes for file operations under the '/api/files' path
app.use('/api/files', fileRoutes);

// Apply the global error handling middleware.
// This must be the last middleware added to the app stack.
app.use(errorHandler);

// Start the HTTP server and listen on the configured port
app.listen(config.PORT, () => {
  console.log(`[Server] File Service is running on port ${config.PORT}`);
  console.log(`[Server] Access health check at http://localhost:${config.PORT}/health`);
  console.log(`[Server] File API available under http://localhost:${config.PORT}/api/files`);
});
