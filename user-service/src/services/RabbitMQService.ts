import * as amqplib from 'amqplib';
import {
    Connection as AmqpConnection,
    Channel as AmqpChannel,
    ConsumeMessage,
} from 'amqplib';
import config from '../config/config';
import { User } from '../database';

class RabbitMQService {
    private requestQueue = 'USER_DETAILS_REQUEST';
    private responseQueue = 'USER_DETAILS_RESPONSE';
    private connection: AmqpConnection | null = null;
    private channel: AmqpChannel | null = null;
    private isConnecting: boolean = false;

    constructor() {
        this.init().catch((err) => {
            console.error('Failed to initialize RabbitMQ:', err);
        });
    }

    async init(): Promise<void> {
        if (this.isConnecting || (this.connection && this.channel)) {
            return;
        }

        this.isConnecting = true;

        try {
            if (!config.msgBrokerURL) {
                throw new Error('RabbitMQ URL not configured');
            }

            const connection: amqplib.ChannelModel = await amqplib.connect(config.msgBrokerURL, {
                connectRetries: 5,
                retryDelay: 2000
            });
            this.connection = connection.connection;

            if (!this.connection) {
                throw new Error('Failed to establish connection');
            }

            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err);
            });

            this.connection.on('close', () => {
                if (!this.connection) return;
            });

            this.channel = await connection.createChannel();
            await this.channel.prefetch(1);

            const queueOptions = {
                durable: true,
                deadLetterExchange: 'dlx',
                messageTtl: 24 * 60 * 60 * 1000,
            };

            await this.channel.assertQueue(this.requestQueue, queueOptions);
            await this.channel.assertQueue(this.responseQueue, queueOptions);

            await this.setupMessageConsumer();
        } catch (error) {
            console.error('Error during RabbitMQ initialization:', error);
            if (this.channel) {
                try {
                    await this.channel.close();
                } catch (e) {
                    console.error('Error closing channel:', e);
                }
                this.channel = null;
            }
            if (this.connection) {
                try {
                    await (this.connection as any).close();
                } catch (e) {
                    console.error('Error closing connection:', e);
                }
                this.connection = null;
            }
            throw error;
        } finally {
            this.isConnecting = false;
        }
    }

    private async setupMessageConsumer(): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }

        if (this.channel && (this.channel as any).consumerTag) {
            return;
        }

        try {
            await this.channel.consume(
                this.requestQueue,
                async (msg: ConsumeMessage | null) => {
                    if (!this.channel || !msg) return;

                    let userId: string | undefined;
                    try {
                        const content = JSON.parse(msg.content.toString());
                        userId = content.userId;

                        if (!userId) {
                            this.channel.ack(msg);
                            return;
                        }

                        const userDetails = await this.getUserDetails(userId);

                        if (!this.channel) return;

                        this.channel.sendToQueue(
                            this.responseQueue,
                            Buffer.from(JSON.stringify(userDetails)),
                            {
                                correlationId: msg.properties.correlationId,
                                persistent: true,
                            }
                        );

                        this.channel.ack(msg);
                    } catch (error) {
                        console.error(
                            `Error processing message${userId ? ` for userId ${userId}` : ''}:`,
                            error
                        );

                        if (this.channel) {
                            this.channel.reject(msg, false);
                        }
                    }
                },
                {
                    noAck: false,
                    consumerTag: `user-service-consumer-${Date.now()}`,
                }
            );
        } catch (error) {
            console.error('Error setting up message consumer:', error);
            throw error;
        }
    }

    private async getUserDetails(userId: string) {
        try {
            const userDetails = await User.findById(userId).select('-password').lean();
            if (!userDetails) {
                return { error: 'User not found', userId };
            }
            return userDetails;
        } catch (error) {
            console.error(`Error fetching user details for ID ${userId}:`, error);
            throw error;
        }
    }
}

export const rabbitMQService = new RabbitMQService();
