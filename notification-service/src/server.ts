import express, { Express } from "express";
import { Server } from "http";
import morgan from "morgan";
import { errorConverter, errorHandler } from "./middleware";
import config from "./config/config";
import { rabbitMQService } from "./services/RabbitMQService";
import logger from '@shared/utils/logger';

const app: Express = express();
let server: Server;

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message: string) => {
            logger.http(message.trim());
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
    logger.debug('Health check requested');
    res.status(200).json({ status: "UP" });
});

app.use(errorConverter);
app.use(errorHandler);

server = app.listen(config.PORT, () => {
    logger.info(`Notification service is running on port ${config.PORT}`, {
        env: config.env,
        port: config.PORT
    });
});

const initializeRabbitMQClient = async () => {
    try {
        logger.info('Initializing RabbitMQ client');
        await rabbitMQService.init();
        logger.info("RabbitMQ client initialized and listening for messages");
    } catch (err) {
        logger.error("Failed to initialize RabbitMQ client:", err);
    }
};

initializeRabbitMQClient();

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info("Server closed");
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    logger.error("Unexpected error occurred:", error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    exitHandler();
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received');
    exitHandler();
});