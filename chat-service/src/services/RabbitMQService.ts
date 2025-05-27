import * as amqp from 'amqplib';
import { v4 as uuidv4 } from "uuid";
import config from "../config/config";

class RabbitMQService {
    private requestQueue = "USER_DETAILS_REQUEST";
    private responseQueue = "USER_DETAILS_RESPONSE";
    private correlationMap = new Map<string, Function>();
    private channel: amqp.Channel | null = null;

    constructor() {
        this.init().catch(err => {
            console.error('Failed to initialize RabbitMQ:', err);
            process.exit(1);
        });
    }

    async init() {
        try {
            if (!config.msgBrokerURL) {
                throw new Error("RabbitMQ URL not configured");
            }

            const connection = await amqp.connect(config.msgBrokerURL);
            this.channel = await connection.createChannel();

            const queueConfig = {
                durable: true,
                arguments: {
                    'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hour TTL
                    'x-dead-letter-exchange': 'dlx'
                }
            };

            await this.channel.assertQueue(this.requestQueue, queueConfig);
            await this.channel.assertQueue(this.responseQueue, queueConfig);

            await this.channel.consume(
                this.responseQueue,
                (msg: amqp.ConsumeMessage | null) => {
                    if (!msg || !this.channel) {
                        return;
                    }

                    try {
                        const correlationId = msg.properties.correlationId;
                        const user = JSON.parse(msg.content.toString());

                        const callback = this.correlationMap.get(correlationId);
                        if (callback) {
                            callback(user);
                            this.correlationMap.delete(correlationId);
                        }

                        this.channel.ack(msg);
                    } catch (error) {
                        console.error("Error processing message:", error);
                        if (this.channel) {
                            this.channel.reject(msg, false);
                        }
                    }
                },
                { noAck: false }
            );

            // Setup error handlers
            connection.on('error', this.handleError.bind(this));
            connection.on('close', this.handleError.bind(this));
            this.channel.on('error', this.handleError.bind(this));
            this.channel.on('close', this.handleError.bind(this));

            console.log("RabbitMQ initialization completed successfully");
        } catch (error) {
            console.error("Error initializing RabbitMQ:", error);
            console.error("Failed to initialize RabbitMQ:", error);
            // Wait before retrying
            setTimeout(() => this.init(), 5000);
        }
    }

    private handleError(error?: Error) {
        console.error('RabbitMQ error:', error);
        this.channel = null;
        setTimeout(() => this.init(), 5000);
    }

    async requestUserDetails(userId: string, callback: Function) {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        const correlationId = uuidv4();
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
            throw new Error('RabbitMQ channel not available');
        }

        if (!config.queue?.notifications) {
            throw new Error('Notifications queue not configured');
        }

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
            } catch (error) {
                console.error('Error sending notification:', error);
                throw error;
            }
        });
    }
}

export const rabbitMQService = new RabbitMQService();