import { Server } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import app from './app';
import { Message, connectDB } from './database';
import config from './config/config';
import { logger } from './utils';

let server: Server;
connectDB();

server = app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});

const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Online users ni saqlash uchun Map
const onlineUsers = new Map<
    string,
    { socketId: string; userId: string; lastSeen: Date }
>();

io.on('connection', (socket: Socket) => {
    console.log('Client connected', { socketId: socket.id });

    // User login qilganda
    socket.on('userOnline', (userId: string) => {
        onlineUsers.set(userId, {
            socketId: socket.id,
            userId: userId,
            lastSeen: new Date(),
        });

        // Barcha clientlarga user online ekanligini xabar berish
        socket.broadcast.emit('userStatusChanged', {
            userId: userId,
            status: 'online',
            lastSeen: new Date(),
        });

        console.log(`User ${userId} is now online`, { socketId: socket.id });

        // Online users list ni jo'natish
        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user) => ({
                userId: user.userId,
                status: 'online',
                lastSeen: user.lastSeen,
            })
        );

        socket.emit('onlineUsersList', onlineUsersList);
    });

    // User disconnect bo'lganda
    socket.on('disconnect', () => {
        console.log('Client disconnected', { socketId: socket.id });

        // Qaysi user disconnect bo'lganini topish
        let disconnectedUserId: string | null = null;
        for (const [userId, userInfo] of onlineUsers.entries()) {
            if (userInfo.socketId === socket.id) {
                disconnectedUserId = userId;
                onlineUsers.delete(userId);
                break;
            }
        }

        // Agar user topilsa, offline statusini broadcast qilish
        if (disconnectedUserId) {
            socket.broadcast.emit('userStatusChanged', {
                userId: disconnectedUserId,
                status: 'offline',
                lastSeen: new Date(),
            });
            console.log(`User ${disconnectedUserId} is now offline`);
        }
    });

    // Message jo'natish
    socket.on('sendMessage', async (data) => {
        try {
            const { senderId, receiverId, message } = data;

            // Messageni bazaga saqlash
            const msg = new Message({ senderId, receiverId, message });
            await msg.save();

            console.log('Message saved successfully', { messageId: msg._id });

            // Receiver online bo'lsa, unga to'g'ridan-to'g'ri jo'natish
            const receiverInfo = onlineUsers.get(receiverId);
            if (receiverInfo) {
                io.to(receiverInfo.socketId).emit('receiveMessage', {
                    _id: msg._id,
                    senderId,
                    receiverId,
                    message,
                    createdAt: msg.createdAt,
                });
            }

            // Senderga ham confirmation jo'natish
            socket.emit('messageSent', {
                _id: msg._id,
                senderId,
                receiverId,
                message,
                createdAt: msg.createdAt,
                delivered: !!receiverInfo,
            });

            logger.debug('Message relayed', {
                messageId: msg._id,
                delivered: !!receiverInfo,
            });
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('messageError', { error: 'Failed to send message' });
        }
    });

    // Online users listini olish
    socket.on('getOnlineUsers', () => {
        const onlineUsersList = Array.from(onlineUsers.values()).map(
            (user) => ({
                userId: user.userId,
                status: 'online',
                lastSeen: user.lastSeen,
            })
        );

        socket.emit('onlineUsersList', onlineUsersList);
    });

    // User typing status
    socket.on(
        'typing',
        (data: { senderId: string; receiverId: string; isTyping: boolean }) => {
            const receiverInfo = onlineUsers.get(data.receiverId);
            if (receiverInfo) {
                io.to(receiverInfo.socketId).emit('userTyping', {
                    senderId: data.senderId,
                    isTyping: data.isTyping,
                });
            }
        }
    );
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

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
