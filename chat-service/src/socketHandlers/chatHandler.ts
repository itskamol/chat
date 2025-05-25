// Chat-related socket event handlers
import { Socket, Server as SocketIOServer } from 'socket.io';
import { Message } from '../database';
import { logger } from '../utils';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../server'; // Adjust path as needed
import { IOnlineUsers } from '../lib/userManager'; // Assuming IOnlineUsers is exported from userManager

export function registerChatHandlers(
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    onlineUsers: IOnlineUsers
) {
    // Message jo'natish
    socket.on('sendMessage', async (data) => {
        try {
            const { senderId, receiverId, message } = data;

            const msg = new Message({ senderId, receiverId, message });
            await msg.save();

            logger.info('Message saved successfully', { messageId: msg._id });

            const receiverInfo = onlineUsers.get(receiverId);
            if (receiverInfo) {
                io.to(receiverInfo.socketId).emit('receiveMessage', {
                    _id: (msg._id as any).toString(),
                    senderId,
                    receiverId,
                    message,
                    createdAt: msg.createdAt,
                });
            }

            socket.emit('messageSent', {
                _id: (msg._id as any).toString(),
                senderId,
                receiverId,
                message,
                createdAt: msg.createdAt,
                delivered: !!receiverInfo,
            });

            // logger.debug('Message relayed', {
            //     messageId: msg._id.toString(),
            //     delivered: !!receiverInfo,
            // });
        } catch (error) {
            logger.error('Error saving message:', error);
            socket.emit('messageError', { error: 'Failed to send message' });
        }
    });

    // User typing status
    socket.on('typing', (data) => {
        const receiverInfo = onlineUsers.get(data.receiverId);
        if (receiverInfo) {
            io.to(receiverInfo.socketId).emit('userTyping', {
                senderId: data.senderId,
                isTyping: data.isTyping,
            });
        }
    });
}
