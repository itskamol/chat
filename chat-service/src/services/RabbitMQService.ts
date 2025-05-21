import * as amqp from 'amqplib';
import { v4 as uuidv4 } from "uuid";
import config from "../config/config";
import logger from '@shared/utils/logger';

class RabbitMQService {
    private requestQueue = "USER_DETAILS_REQUEST";
    private responseQueue = "USER_DETAILS_RESPONSE";
    private correlationMap = new Map<string, Function>();
    private channel: amqp.Channel | null = null;

    constructor() {
        logger.info('Initializing RabbitMQ service');
        this.init().catch(err => {
            logger.error('Failed to initialize RabbitMQ:', err);
            process.exit(1);
        });
    }

    async init() {
        try {
            if (!config.msgBrokerURL) {
                const error = new Error("RabbitMQ URL not configured");
                logger.error(error.message);
                throw error;
            }

            logger.debug('Connecting to RabbitMQ', { url: config.msgBrokerURL });
            const connection = await amqp.connect(config.msgBrokerURL);
            this.channel = await connection.createChannel();

            const queueConfig = {
                durable: true,
                arguments: {
                    'x-message-ttl': 24 * 60 * 60 * 1000,
                    'x-dead-letter-exchange': 'dlx'
                }
            };

            logger.debug('Asserting queues', { requestQueue: this.requestQueue, responseQueue: this.responseQueue });
            await this.channel.assertQueue(this.requestQueue, queueConfig);
            await this.channel.assertQueue(this.responseQueue, queueConfig);

            await this.setupResponseConsumer();

            connection.on('error', (err) => {
                logger.error('RabbitMQ connection error:', err);
                this.handleError(err);
            });

            connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.handleError();
            });

            this.channel.on('error', (err) => {
                logger.error('RabbitMQ channel error:', err);
                this.handleError(err);
            });

            this.channel.on('close', () => {
                logger.warn('RabbitMQ channel closed');
                this.handleError();
            });

            logger.info('RabbitMQ initialization completed successfully');
        } catch (error) {
            logger.error('Failed to initialize RabbitMQ:', error);
            setTimeout(() => this.init(), 5000);
        }
    }

    private async setupResponseConsumer() {
        if (!this.channel) {
            logger.error('Cannot setup consumer - channel not initialized');
            return;
        }

        logger.debug('Setting up response consumer');
        await this.channel.consume(
            this.responseQueue,
            (msg: amqp.ConsumeMessage | null) => {
                if (!msg || !this.channel) {
                    return;
                }

                try {
                    const correlationId = msg.properties.correlationId;
                    const user = JSON.parse(msg.content.toString());
                    logger.debug('Received response message', { correlationId });

                    const callback = this.correlationMap.get(correlationId);
                    if (callback) {
                        callback(user);
                        this.correlationMap.delete(correlationId);
                        logger.debug('Successfully processed response', { correlationId });
                    } else {
                        logger.warn('No callback found for correlation ID', { correlationId });
                    }

                    this.channel.ack(msg);
                } catch (error) {
                    logger.error('Error processing response message:', error);
                    if (this.channel) {
                        this.channel.reject(msg, false);
                    }
                }
            },
            { noAck: false }
        );
    }

    private handleError(error?: Error) {
        logger.error('RabbitMQ error occurred:', error);
        this.channel = null;
        setTimeout(() => this.init(), 5000);
    }

    async requestUserDetails(userId: string, callback: Function) {
        if (!this.channel) {
            const error = new Error('RabbitMQ channel not available');
            logger.error(error.message);
            throw error;
        }

        const correlationId = uuidv4();
        logger.debug('Requesting user details', { userId, correlationId });
        
        this.correlationMap.set(correlationId, callback);

        this.channel.sendToQueue(
            this.requestQueue,
            Buffer.from(JSON.stringify({ userId })),
            { 
                correlationId,
                persistent: true
            }
        );
    }

    async notifyReceiver(
        receiverId: string,
        messageContent: string,
        senderEmail: string,
        senderName: string
    ) {
        if (!this.channel) {
            const error = new Error('RabbitMQ channel not available');
            logger.error(error.message);
            throw error;
        }

        if (!config.queue?.notifications) {
            const error = new Error('Notifications queue not configured');
            logger.error(error.message);
            throw error;
        }

        logger.debug('Sending notification request', { receiverId, senderName });

        await this.requestUserDetails(receiverId, async (user: any) => {
            const notificationPayload = {
                type: "MESSAGE_RECEIVED",
                userId: receiverId,
                userEmail: user.email,
                message: messageContent,
                from: senderEmail,
                fromName: senderName,
            };

            try {
                await this.channel?.assertQueue(config.queue.notifications, {
                    durable: true,
                    arguments: {
                        'x-message-ttl': 24 * 60 * 60 * 1000,
                        'x-dead-letter-exchange': 'dlx'
                    }
                });

                this.channel?.sendToQueue(
                    config.queue.notifications,
                    Buffer.from(JSON.stringify(notificationPayload)),
                    { persistent: true }
                );
                logger.debug('Notification sent successfully', { receiverId });
            } catch (error) {
                logger.error('Error sending notification:', error);
                throw error;
            }
        });
    }
}

export const rabbitMQService = new RabbitMQService();