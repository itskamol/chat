import amqp, { Channel, ChannelModel, Connection, ConsumeMessage } from 'amqplib';
import config from '../config/config';
import { FCMService } from './FCMService';
import { EmailService } from './EmailService';
import { UserStatusStore } from '../utils';
import logger from '@shared/utils/logger';

interface NotificationMessage {
    type: string;
    userId: string;
    message: string;
    userEmail: string;
    userToken?: string;
    fromName: string;
}

class RabbitMQService {
    private channel!: Channel;
    private fcmService = new FCMService();
    private emailService = new EmailService();
    private userStatusStore = new UserStatusStore();

    constructor() {
        logger.info('Initializing Notification Service RabbitMQ');
        this.init();
    }

    async init() {
        try {
            logger.debug('Connecting to RabbitMQ', { url: config.msgBrokerURL });
            const connection: ChannelModel = await amqp.connect(config.msgBrokerURL!);

            connection.on('error', (error: Error) => {
                logger.error('RabbitMQ connection error:', error);
                setTimeout(() => this.init(), 5000);
            });

            connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                setTimeout(() => this.init(), 5000);
            });

            this.channel = await connection.createChannel();
            logger.info('RabbitMQ channel created');

            await this.consumeNotification();
            logger.info('Notification consumer setup complete');
        } catch (error) {
            logger.error('Failed to initialize RabbitMQ:', error);
            setTimeout(() => this.init(), 5000);
        }
    }

    async consumeNotification() {
        try {
            logger.debug('Setting up notification queue', {
                queue: config.queue.notifications,
            });
            await this.channel.assertQueue(config.queue.notifications);

            this.channel.consume(
                config.queue.notifications,
                async (msg: ConsumeMessage | null) => {
                    if (msg) {
                        try {
                            logger.debug('Received notification message');
                            const payload: NotificationMessage = JSON.parse(
                                msg.content.toString()
                            );
                            const {
                                type,
                                userId,
                                message,
                                userEmail,
                                userToken,
                                fromName,
                            } = payload;

                            logger.debug('Processing notification', { type, userId });

                            if (type === 'MESSAGE_RECEIVED') {
                                const isUserOnline =
                                    this.userStatusStore.isUserOnline(userId);
                                logger.debug('User online status', {
                                    userId,
                                    isOnline: isUserOnline,
                                });

                                if (isUserOnline && userToken) {
                                    logger.debug('Sending push notification', {
                                        userId,
                                    });
                                    await this.fcmService.sendPushNotification(
                                        userToken,
                                        message
                                    );
                                } else if (userEmail) {
                                    logger.debug('Sending email notification', {
                                        userEmail,
                                    });
                                    await this.emailService.sendEmail(
                                        userEmail,
                                        `New Message from ${fromName}`,
                                        message
                                    );
                                }
                            }

                            this.channel.ack(msg);
                            logger.debug('Message processed successfully');
                        } catch (error) {
                            logger.error('Error processing notification:', error);
                            // Negative acknowledge with requeue false to prevent infinite loop
                            this.channel.nack(msg, false, false);
                        }
                    }
                }
            );
        } catch (error) {
            logger.error('Error in consumeNotification:', error);
            throw error;
        }
    }
}

export const rabbitMQService = new RabbitMQService();
