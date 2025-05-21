import { Server } from "http";
import { Socket, Server as SocketIOServer } from "socket.io";
import app from "./app";
import { Message, connectDB } from "./database";
import config from "./config/config";
import { logger } from './utils';

let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    logger.info(`Server is running on port ${config.PORT}`);
});

const io = new SocketIOServer(server);
io.on("connection", (socket: Socket) => {
    logger.info("Client connected", { socketId: socket.id });
    socket.on("disconnect", () => {
        logger.info("Client disconnected", { socketId: socket.id });
    });

    socket.on("sendMessage", (message) => {
        io.emit("receiveMessage", message);
        logger.debug("Message relayed", { message });
    });

    socket.on("sendMessage", async (data) => {
        try {
            const { senderId, receiverId, message } = data;
            const msg = new Message({ senderId, receiverId, message });
            await msg.save();
            logger.info("Message saved successfully", { messageId: msg._id });
        } catch (error) {
            logger.error("Error saving message:", error);
        }
    });
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