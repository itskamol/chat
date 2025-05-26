import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { Message } from '../database';
import { logger } from '../utils';

export class MessageService {
    constructor(private io: SocketIOServer) {}

    public async saveAndDeliverMessage(
        senderId: string,
        receiverId: string,
        message: string,
        senderSocket: Socket,
        receiverSocketId?: string
    ): Promise<{ success: boolean; error?: string; messageId?: string }> {
        try {
            // Save message to database
            const msg = new Message({
                senderId,
                receiverId,
                message,
            }) as InstanceType<typeof Message> & { _id: string };
            await msg.save();

            const messageId = msg._id.toString();
            const messageData = {
                _id: messageId,
                senderId,
                receiverId,
                message,
                createdAt: msg.createdAt,
            };

            // If receiver is online, deliver message
            if (receiverSocketId) {
                this.io.to(receiverSocketId).emit('receiveMessage', messageData);
            }

            // Send confirmation to sender
            senderSocket.emit('messageSent', {
                ...messageData,
                delivered: !!receiverSocketId
            });

            logger.debug('Message relayed', {
                messageId,
                delivered: !!receiverSocketId
            });

            return { success: true, messageId };
        } catch (error) {
            logger.error('Error saving message:', error);
            return { success: false, error: 'Failed to send message' };
        }
    }

    public async getMessages(
        userId: string,
        contactId: string,
        page = 1,
        limit = 50
    ) {
        try {
            const skip = (page - 1) * limit;
            const messages = await Message.find({
                $or: [
                    { senderId: userId, receiverId: contactId },
                    { senderId: contactId, receiverId: userId }
                ]
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            return { success: true, messages };
        } catch (error) {
            logger.error('Error fetching messages:', error);
            return { success: false, error: 'Failed to fetch messages' };
        }
    }

    public async markMessageAsRead(messageId: string) {
        try {
            await Message.findByIdAndUpdate(messageId, { read: true });
            return { success: true };
        } catch (error) {
            logger.error('Error marking message as read:', error);
            return { success: false, error: 'Failed to mark message as read' };
        }
    }
}
