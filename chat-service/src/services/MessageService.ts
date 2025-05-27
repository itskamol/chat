import { 
    AuthenticatedSocket, // Assuming this is the correctly typed socket from @shared
    SocketEvent,
    Message as SharedMessage, // Renaming to avoid conflict with Mongoose model
    MessageSentPayload,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    MessageType as SharedMessageType, // Enum for message type
    MessageStatus as SharedMessageStatus // Enum for message status
} from '@chat/shared';
import { Server as SocketIOServer } from 'socket.io';
import { Message as MessageModel } from '../database'; // Mongoose model
import { logger } from '../utils';

export class MessageService {
    constructor(private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {}

    public async saveAndDeliverMessage(
        senderId: string,
        receiverId: string,
        content: string, // Changed from 'message' to 'content' for consistency
        senderSocket: AuthenticatedSocket, // Use AuthenticatedSocket from @shared
        receiverSocketId?: string,
        type?: SharedMessageType, // Use shared enum
        tempId?: string // Added tempId from client
    ): Promise<{ success: boolean; error?: string; messageId?: string; tempId?: string }> {
        try {
            const newMessage = new MessageModel({
                senderId,
                receiverId,
                content: content, // Storing as 'content' in DB if model is updated, or map here
                type: type || SharedMessageType.TEXT, // Default to TEXT
                status: receiverSocketId ? SharedMessageStatus.DELIVERED : SharedMessageStatus.NOT_DELIVERED,
                // fileUrl, fileName etc. would be set here if it's a file message
            });
            // This part assumes the MessageModel uses 'content' and 'type' internally
            // or there's a mapping. For this refactor, we assume direct use or later model update.
            
            const savedMessage = await newMessage.save();
            const messageId = savedMessage._id.toString();

            // Prepare the SharedMessage object for broadcasting and sender confirmation
            const sharedMessageData: SharedMessage = {
                id: messageId,
                senderId,
                receiverId,
                content: savedMessage.content, 
                type: savedMessage.type as SharedMessageType, // Cast if necessary
                status: savedMessage.status as SharedMessageStatus, 
                createdAt: savedMessage.createdAt,
                updatedAt: savedMessage.updatedAt,
                // fileUrl, fileName, etc., if applicable
            };
            
            // If receiver is online, deliver message
            if (receiverSocketId) {
                this.io.to(receiverSocketId).emit(SocketEvent.RECEIVE_MESSAGE, sharedMessageData);
            }

            // Send confirmation to sender
            const messageSentPayload: MessageSentPayload = {
                ...sharedMessageData,
                delivered: !!receiverSocketId,
                tempId: tempId // Pass back the tempId
            };
            senderSocket.emit(SocketEvent.MESSAGE_SENT, messageSentPayload);

            logger.debug('Message relayed', {
                messageId,
                delivered: !!receiverSocketId,
                tempId
            });

            return { success: true, messageId, tempId };
        } catch (error: any) {
            logger.error('Error saving message:', error);
            return { success: false, error: 'Failed to send message', tempId };
        }
    }

    public async getMessages(
        userId: string,
        receiverId: string,
        page = 1,
        limit = 50
    ): Promise<{ success: boolean; messages?: SharedMessage[]; error?: string }> {
        try {
            const skip = (page - 1) * limit;
            const dbMessages = await MessageModel.find({
                $or: [
                    { senderId: userId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: userId }
                ]
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec();

            const messages: SharedMessage[] = dbMessages.map(msg => ({
                id: msg._id.toString(),
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                content: msg.content, // Assuming model uses 'content'
                type: msg.type as SharedMessageType,
                status: msg.status as SharedMessageStatus, // Cast if necessary
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
                fileUrl: msg.fileUrl,
                fileName: msg.fileName,
                fileMimeType: msg.fileMimeType,
                fileSize: msg.fileSize,
            }));

            return { success: true, messages };
        } catch (error: any) {
            logger.error('Error fetching messages:', error);
            return { success: false, error: 'Failed to fetch messages' };
        }
    }

    public async markMessageAsRead(messageId: string, userId: string /* userId who is marking it as read */): Promise<{ success: boolean; error?: string; message?: SharedMessage }> {
        try {
            // Find the message and ensure the receiver is the one marking it as read.
            const dbMessage = await MessageModel.findOneAndUpdate(
                { _id: messageId, receiverId: userId, status: { $ne: SharedMessageStatus.SEEN } },
                { $set: { status: SharedMessageStatus.SEEN, updatedAt: new Date() } },
                { new: true }
            ).lean().exec();

            if (!dbMessage) {
                logger.warn(`Message ${messageId} not updated to SEEN for user ${userId}. Might be already seen or not recipient.`);
                const existingMsg = await MessageModel.findById(messageId).lean().exec();
                if (!existingMsg) return { success: false, error: 'Message not found.' };
                
                // Map existingMsg to SharedMessage
                const sharedExistingMessage: SharedMessage = {
                    id: existingMsg._id.toString(),
                    senderId: existingMsg.senderId,
                    receiverId: existingMsg.receiverId,
                    content: existingMsg.content,
                    type: existingMsg.type as SharedMessageType,
                    status: existingMsg.status as SharedMessageStatus,
                    createdAt: existingMsg.createdAt,
                    updatedAt: existingMsg.updatedAt,
                    fileUrl: existingMsg.fileUrl,
                    fileName: existingMsg.fileName,
                    fileMimeType: existingMsg.fileMimeType,
                    fileSize: existingMsg.fileSize,
                };
                return { success: true, message: sharedExistingMessage }; // Or return success:false if strict update is required
            }
            
            const updatedMessage: SharedMessage = {
                id: dbMessage._id.toString(),
                senderId: dbMessage.senderId,
                receiverId: dbMessage.receiverId,
                content: dbMessage.content,
                type: dbMessage.type as SharedMessageType,
                status: dbMessage.status as SharedMessageStatus,
                createdAt: dbMessage.createdAt,
                updatedAt: dbMessage.updatedAt,
                fileUrl: dbMessage.fileUrl,
                fileName: dbMessage.fileName,
                fileMimeType: dbMessage.fileMimeType,
                fileSize: dbMessage.fileSize,
            };
            
            // Optionally, notify the sender that the message was read
            // const senderSocketId = this.socketService.getSocketIdByUserId(dbMessage.senderId);
            // if (senderSocketId) {
            //   this.io.to(senderSocketId).emit(SocketEvent.MESSAGE_READ_RECEIPT, { messageId: dbMessage._id, readAt: dbMessage.updatedAt, readerId: userId });
            // }

            return { success: true, message: updatedMessage };
        } catch (error: any) {
            logger.error('Error marking message as read:', error);
            return { success: false, error: 'Failed to mark message as read' };
        }
    }
}
