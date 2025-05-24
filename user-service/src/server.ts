import express, { Express } from "express";
import morgan from "morgan";
import { Server } from "http";
import appRouter from "./routes"
import { errorConverter, errorHandler } from "./middleware";
import { connectDB } from "./database";
import config from "./config/config";
import { rabbitMQService } from "./services/RabbitMQService";

const app: Express = express();
let server: Server;

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            console.log(message.trim());
        },
    },
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(appRouter)

app.use(errorConverter);
app.use(errorHandler);

connectDB();

const initializeRabbitMQClient = async () => {
    try {
        await rabbitMQService.init();
        console.log('RabbitMQ client initialized successfully');
    } catch (err) {
        console.error('Failed to initialize RabbitMQ client:', err);
    }
};

initializeRabbitMQClient();

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT} (Environment: ${config.env})`);
});

const exitHandler = () => {
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    console.error('Unexpected error occurred:', error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    if (server) {
        server.close();
    }
});

process.on('SIGINT', () => {
    console.log('SIGINT received');
    if (server) {
        server.close();
    }
});