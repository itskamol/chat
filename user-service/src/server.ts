import express, { Express } from "express";
import morgan from "morgan";
import { Server } from "http";
import userRouter from "./routes/authRoutes";
import { errorConverter, errorHandler } from "./middleware";
import { connectDB } from "./database";
import config from "./config/config";
import { rabbitMQService } from "./services/RabbitMQService";
import { logger } from './utils';

const app: Express = express();
let server: Server;

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            logger.http(message.trim());
        },
    },
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(userRouter);

app.use(errorConverter);
app.use(errorHandler);

connectDB();

const initializeRabbitMQClient = async () => {
    try {
        await rabbitMQService.init();
        logger.info('RabbitMQ client initialized successfully');
    } catch (err) {
        logger.error('Failed to initialize RabbitMQ client:', err);
    }
};

initializeRabbitMQClient();

server = app.listen(config.PORT, () => {
    logger.info(`Server is running on port ${config.PORT} (Environment: ${config.env})`);
});

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    logger.error('Unexpected error occurred:', error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
        server.close();
    }
});

process.on('SIGINT', () => {
    logger.info('SIGINT received');
    if (server) {
        server.close();
    }
});