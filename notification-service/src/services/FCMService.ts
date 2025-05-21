import admin from 'firebase-admin';
import logger from '@shared/utils/logger';

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});

export class FCMService {
    constructor() {
        logger.info('FCM Service initialized');
    }

    async sendPushNotification(token: string, message: string) {
        logger.debug('Preparing push notification', { messageLength: message.length });
        
        const payload = {
            notification: {
                title: 'New Message',
                body: message,
            },
            token: token,
        };

        try {
            logger.debug('Sending FCM notification', { token });
            const response = await admin.messaging().send(payload);
            logger.info('Push notification sent successfully', { messageId: response });
        } catch (error) {
            logger.error('Error sending push notification:', {
                error,
                token,
                messageLength: message.length
            });
            throw error;
        }
    }
}
