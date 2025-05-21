import { UserStatusStore } from './userStatusStore';
import { rabbitMQService } from '../services/RabbitMQService';
import logger from '@shared/utils/logger';

const userStatusStore = UserStatusStore.getInstance();

export const handleMessageReceived = async (
    senderName: string,
    senderEmail: string,
    receiverId: string,
    messageContent: string
) => {
    logger.debug('Handling received message', {
        senderName,
        receiverId,
        messageLength: messageContent.length,
    });

    const receiverIsOffline = !userStatusStore.isUserOnline(receiverId);
    logger.debug('Receiver online status', {
        receiverId,
        isOnline: !receiverIsOffline,
    });

    if (receiverIsOffline) {
        logger.debug('Receiver is offline, sending notification', {
            receiverId,
        });
        try {
            await rabbitMQService.notifyReceiver(
                receiverId,
                messageContent,
                senderEmail,
                senderName
            );
            logger.debug('Notification sent successfully', { receiverId });
        } catch (error) {
            logger.error('Failed to send notification', { error, receiverId });
            throw error;
        }
    }
};
