/**
 * @file app.ts
 * @description Configures and exports the main Express application instance for the chat-service.
 * This file sets up essential middleware for request logging (Morgan), JSON and URL-encoded
 * body parsing, mounts application-specific routes (messageRoutes), and registers
 * global error handling middleware.
 * The Express app instance created here is imported by `server.ts` to start the HTTP server.
 */
import express, { Express } from "express";
import morgan from "morgan"; // HTTP request logger middleware
import messageRoutes from "./routes/messageRoutes"; // Routes for message-related operations
// import fileRoutes from "./routes/fileRoutes"; // Legacy file routes, now deleted. Kept for historical context.
import { errorConverter, errorHandler } from "./middleware"; // Custom error handling middleware

// Initialize the Express application
const app: Express = express();

// Setup Morgan for HTTP request logging.
// It's configured to use a 'combined' format.
// The stream option is customized to use `console.log` for output.
// In a production setup, this could be integrated with a more advanced logger like Winston.
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            // TODO: Replace with a proper logger instance (e.g., Winston) if advanced logging is needed.
            console.log(message.trim());
        },
    },
}));

// Standard middleware for parsing common request body formats
app.use(express.json()); // Parses incoming requests with JSON payloads.
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads.

// Mount application-specific routes
// app.use(fileRoutes); // Legacy file routes were removed as file handling is now delegated to file-service.
app.use(messageRoutes); // Mounts routes related to messages (text, file uploads via FileController).

// Global error handling middleware.
// These must be registered last, after all other middleware and routes.
app.use(errorConverter); // Converts non-ApiError errors to ApiError instances.
app.use(errorHandler);   // Handles ApiError instances and sends standardized error responses.

export default app;