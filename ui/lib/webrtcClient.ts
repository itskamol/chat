import * as mediasoupClient from 'mediasoup-client';
import {
    emitGetRouterRtpCapabilities,
    emitCreateWebRtcTransport,
    emitConnectWebRtcTransport,
    emitProduce,
    emitConsume,
    getSocket,
} from './socket'; // Assuming your socket emitters are here
import {
    RtpCapabilities,
    ConsumerParams,
    WebRtcTransportParams,
} from '../types/webrtc'; // Use local types

export interface ProducerInfo {
    id: string; // Producer ID from server
    kind: 'audio' | 'video';
    // localProducer?: mediasoupClient.types.Producer; // Optional: store local producer instance
}

export interface ConsumerInfo {
    appData: any;
    id: string; // Consumer ID from server
    producerId: string;
    kind: 'audio' | 'video';
    track: MediaStreamTrack;
    // remoteConsumer?: mediasoupClient.types.Consumer; // Optional: store remote consumer instance
}

export class WebRTCClient {
    private device: mediasoupClient.types.Device | null = null;
    private sendTransport: mediasoupClient.types.Transport | null = null;
    private recvTransport: mediasoupClient.types.Transport | null = null;
    private producers: Map<string, mediasoupClient.types.Producer> = new Map(); // track.kind -> Producer
    private consumers: Map<string, mediasoupClient.types.Consumer> = new Map(); // consumer.id -> Consumer
    private roomId: string | null = null;
    private socket = getSocket(); // Get the initialized socket instance

    constructor() {
        if (!this.socket) {
            console.error('Socket not initialized for WebRTCClient');
            throw new Error(
                'Socket not initialized for WebRTCClient. Ensure getSocket() provides a connected socket.'
            );
        }
    }

    public isInitialized(): boolean {
        return !!this.device;
    }

    public async loadDevice(currentRoomId: string): Promise<void> {
        if (this.device?.loaded) {
            console.log('Mediasoup device already loaded.');
            this.roomId = currentRoomId; // Update roomId if it changed (e.g. rejoining)
            return;
        }
        this.roomId = currentRoomId;

        return new Promise((resolve, reject) => {
            emitGetRouterRtpCapabilities(
                this.roomId!,
                (routerRtpCapabilities) => {
                    if ('error' in routerRtpCapabilities) {
                        console.error(
                            'Failed to get Router RTP Capabilities:',
                            routerRtpCapabilities.error
                        );
                        return reject(
                            new Error(
                                `Failed to get Router RTP Capabilities: ${routerRtpCapabilities.error}`
                            )
                        );
                    }
                    try {
                        this.device = new mediasoupClient.Device();
                        this.device
                            .load({
                                routerRtpCapabilities:
                                    routerRtpCapabilities as RtpCapabilities,
                            })
                            .then(() => {
                                console.log(
                                    'Mediasoup device loaded successfully'
                                );
                                resolve();
                            })
                            .catch((error) => {
                                console.error(
                                    'Error loading mediasoup device:',
                                    error
                                );
                                reject(error);
                            });
                    } catch (error) {
                        console.error(
                            'Error initializing mediasoup device:',
                            error
                        );
                        reject(error);
                    }
                }
            );
        });
    }

    public async createSendTransport(): Promise<mediasoupClient.types.Transport> {
        if (!this.device) throw new Error('Device not loaded');
        if (!this.roomId) throw new Error('Room ID not set for send transport');

        return new Promise((resolve, reject) => {
            emitCreateWebRtcTransport(
                {
                    roomId: this.roomId!,
                    producing: true,
                    consuming: false,
                    sctpCapabilities: this.device?.sctpCapabilities,
                },
                (transportParams) => {
                    if ('error' in transportParams) {
                        console.error(
                            'Error creating send transport on server:',
                            transportParams.error
                        );
                        return reject(new Error(transportParams.error));
                    }

                    const params = transportParams as WebRtcTransportParams;
                    // Create transport options that match mediasoup-client's expected format
                    const transportOptions: mediasoupClient.types.TransportOptions =
                        {
                            id: params.id,
                            iceParameters:
                                params.iceParameters as mediasoupClient.types.IceParameters,
                            iceCandidates:
                                params.iceCandidates as mediasoupClient.types.IceCandidate[],
                            dtlsParameters:
                                params.dtlsParameters as mediasoupClient.types.DtlsParameters,
                            sctpParameters: params.sctpCapabilities as
                                | mediasoupClient.types.SctpParameters
                                | undefined,
                        };

                    this.sendTransport =
                        this.device!.createSendTransport(transportOptions);
                    console.log(
                        'Send transport created:',
                        this.sendTransport.id
                    );

                    this.sendTransport.on(
                        'connect',
                        async ({ dtlsParameters }, callback, errback) => {
                            console.log('Send transport connect event');
                            emitConnectWebRtcTransport(
                                {
                                    roomId: this.roomId!,
                                    transportId: this.sendTransport!.id,
                                    dtlsParameters,
                                },
                                (response) => {
                                    if (response.error) {
                                        console.error(
                                            'Error connecting send transport on server:',
                                            response.error
                                        );
                                        errback(new Error(response.error));
                                    } else {
                                        console.log(
                                            'Send transport connected successfully on server'
                                        );
                                        callback();
                                    }
                                }
                            );
                        }
                    );

                    this.sendTransport.on(
                        'produce',
                        async (
                            { kind, rtpParameters, appData },
                            callback,
                            errback
                        ) => {
                            console.log('Send transport produce event:', {
                                kind,
                                appData,
                            });
                            emitProduce(
                                {
                                    roomId: this.roomId!,
                                    transportId: this.sendTransport!.id,
                                    kind,
                                    rtpParameters,
                                    appData,
                                },
                                (response) => {
                                    if (
                                        response.error ||
                                        !response.producerId
                                    ) {
                                        console.error(
                                            `Error producing ${kind} on server:`,
                                            response.error
                                        );
                                        errback(
                                            new Error(
                                                response.error ||
                                                    'Producer ID not returned'
                                            )
                                        );
                                    } else {
                                        console.log(
                                            `${kind} produced successfully on server, producerId:`,
                                            response.producerId
                                        );
                                        callback({ id: response.producerId });
                                    }
                                }
                            );
                        }
                    );

                    this.sendTransport.on('connectionstatechange', (state) => {
                        console.log(
                            `Send transport connection state: ${state}`
                        );
                        // Handle states like 'failed', 'disconnected', 'closed'
                        // This can be propagated to the VideoCallContext
                        if (state === 'failed') {
                            console.error('Send transport connection failed');
                            // Potentially trigger a reconnect or notify user
                        }
                    });
                    resolve(this.sendTransport);
                }
            );
        });
    }

    public async createRecvTransport(): Promise<mediasoupClient.types.Transport> {
        if (!this.device) throw new Error('Device not loaded');
        if (!this.roomId) throw new Error('Room ID not set for recv transport');

        return new Promise((resolve, reject) => {
            emitCreateWebRtcTransport(
                {
                    roomId: this.roomId!,
                    producing: false,
                    consuming: true,
                    sctpCapabilities: this.device?.sctpCapabilities,
                },
                (transportParams) => {
                    if ('error' in transportParams) {
                        console.error(
                            'Error creating recv transport on server:',
                            transportParams.error
                        );
                        return reject(new Error(transportParams.error));
                    }

                    const params = transportParams as WebRtcTransportParams;
                    // Create transport options that match mediasoup-client's expected format
                    const transportOptions: mediasoupClient.types.TransportOptions =
                        {
                            id: params.id,
                            iceParameters:
                                params.iceParameters as mediasoupClient.types.IceParameters,
                            iceCandidates:
                                params.iceCandidates as mediasoupClient.types.IceCandidate[],
                            dtlsParameters:
                                params.dtlsParameters as mediasoupClient.types.DtlsParameters,
                            sctpParameters: params.sctpCapabilities as
                                | mediasoupClient.types.SctpParameters
                                | undefined,
                        };

                    this.recvTransport =
                        this.device!.createRecvTransport(transportOptions);
                    console.log(
                        'Recv transport created:',
                        this.recvTransport.id
                    );

                    this.recvTransport.on(
                        'connect',
                        ({ dtlsParameters }, callback, errback) => {
                            console.log('Recv transport connect event');
                            emitConnectWebRtcTransport(
                                {
                                    roomId: this.roomId!,
                                    transportId: this.recvTransport!.id,
                                    dtlsParameters,
                                },
                                (response) => {
                                    if (response.error) {
                                        console.error(
                                            'Error connecting recv transport on server:',
                                            response.error
                                        );
                                        errback(new Error(response.error));
                                    } else {
                                        console.log(
                                            'Recv transport connected successfully on server'
                                        );
                                        callback();
                                    }
                                }
                            );
                        }
                    );

                    this.recvTransport.on('connectionstatechange', (state) => {
                        console.log(
                            `Recv transport connection state: ${state}`
                        );
                        // Handle states like 'failed', 'disconnected', 'closed'
                        if (state === 'failed') {
                            console.error(
                                'Receive transport connection failed'
                            );
                        }
                    });
                    resolve(this.recvTransport);
                }
            );
        });
    }

    public async produce(
        track: MediaStreamTrack,
        appData?: any
    ): Promise<mediasoupClient.types.Producer> {
        if (!this.sendTransport) throw new Error('Send transport not created');
        if (!track) throw new Error('Track is required to produce');

        console.log(`Attempting to produce ${track.kind} track:`, track);
        const producer = await this.sendTransport.produce({
            track,
            appData: { ...appData, trackKind: track.kind }, // Ensure kind is in appData if not directly passed
            // encodings can be specified here if needed, e.g. for simulcast
        });

        this.producers.set(track.kind, producer); // Store producer by kind (audio/video)
        console.log(
            `${track.kind} producer created:`,
            producer.id,
            'appData:',
            producer.appData
        );

        producer.on('trackended', () => {
            console.log(
                `${track.kind} track ended (e.g., user stopped sharing)`
            );
            if (track.kind === 'audio' || track.kind === 'video') {
                this.closeProducer(track.kind);
            } else {
                console.warn(`Unsupported track kind: ${track.kind}`);
            }
        });

        producer.on('transportclose', () => {
            console.log(`Transport closed for ${track.kind} producer`);
            this.producers.delete(track.kind);
        });

        return producer;
    }

    public async consume(
        producerId: string,
        kind: 'audio' | 'video',
        rtpCapabilities: RtpCapabilities,
        appData?: any
    ): Promise<ConsumerInfo | null> {
        if (!this.recvTransport) {
            console.error('Receive transport not available for consuming');
            throw new Error('Receive transport not created');
        }
        if (!this.device?.canProduce('video') && kind === 'video') {
            // Check based on kind
            console.warn(
                `Device cannot produce ${kind}, so cannot consume for it with current RTP capabilities.`
            );
            // This check might be more nuanced: device.rtpCapabilities should be sufficient for consuming what server offers
        }

        return new Promise<ConsumerInfo | null>((resolve, reject) => {
            emitConsume(
                {
                    roomId: this.roomId!,
                    transportId: this.recvTransport!.id,
                    producerId,
                    rtpCapabilities, // Send client's (device's) RTP capabilities
                },
                async (consumerParams) => {
                    if ('error' in consumerParams || !consumerParams.id) {
                        console.error(
                            `Error consuming ${kind} for producer ${producerId} on server:`,
                            'error' in consumerParams
                                ? consumerParams.error
                                : 'No params'
                        );
                        return reject(
                            new Error(
                                'error' in consumerParams
                                    ? consumerParams.error
                                    : 'Failed to get consumer parameters'
                            )
                        );
                    }

                    const typedParams = consumerParams as ConsumerParams;

                    try {
                        const consumer = await this.recvTransport!.consume({
                            id: typedParams.id,
                            producerId: typedParams.producerId,
                            kind: typedParams.kind,
                            rtpParameters: typedParams.rtpParameters,
                            appData: {
                                ...typedParams.appData,
                                consumingUserId: 'self',
                            }, // Or actual user ID from context
                        });

                        this.consumers.set(consumer.id, consumer);
                        console.log(
                            `${typedParams.kind} consumer created:`,
                            consumer.id,
                            'for producer:',
                            typedParams.producerId
                        );

                        consumer.on('trackended', () => {
                            console.log(
                                `Track ended for consumer ${consumer.id}`
                            );
                            this.closeConsumer(consumer.id);
                            // Notify UI to remove this stream
                        });

                        consumer.on('transportclose', () => {
                            console.log(
                                `Transport closed for consumer ${consumer.id}`
                            );
                            this.consumers.delete(consumer.id);
                            // Notify UI
                        });

                        resolve({
                            appData: typedParams.appData, // Ensure appData is included
                            id: consumer.id,
                            producerId: typedParams.producerId,
                            kind: typedParams.kind,
                            track: consumer.track,
                            // remoteConsumer: consumer
                        });
                    } catch (error) {
                        console.error(
                            'Error creating mediasoup consumer:',
                            error
                        );
                        reject(error);
                    }
                }
            );
        });
    }

    public closeProducer(kind: 'audio' | 'video'): void {
        const producer = this.producers.get(kind);
        if (producer) {
            console.log(`Closing ${kind} producer:`, producer.id);
            producer.close(); // This should also trigger 'trackended' if not already handled
            this.producers.delete(kind);
            // Notify server? Mediasoup server might auto-detect producer closure.
            // If explicit signaling is needed: emit('producerClosed', { producerId: producer.id, roomId: this.roomId })
        }
    }

    public closeConsumer(consumerId: string): void {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            console.log('Closing consumer:', consumer.id);
            consumer.close();
            this.consumers.delete(consumerId);
            // This should be called when the associated remote track ends or user leaves
        }
    }

    public getDeviceRtpCapabilities(): RtpCapabilities | undefined {
        return this.device?.rtpCapabilities;
    }

    public getSendTransportId(): string | null {
        return this.sendTransport?.id || null;
    }

    public async produceScreenShare(payload: {
        track: MediaStreamTrack;
        appData?: any;
    }): Promise<string> {
        if (!this.sendTransport)
            throw new Error('Send transport not created for screen share');
        if (!this.roomId) throw new Error('Room ID not set for screen share');
        if (!payload.track) throw new Error('Screen share track is required');

        console.log('Attempting to produce screen share track:', payload.track);

        // Note: The actual mediasoupClient.Transport.produce() is called via the 'produce' event listener
        // on the transport, which then calls emitProduce or emitStartScreenShare.
        // This method's role is to initiate that process via the correct socket event.
        return new Promise<string>((resolve, reject) => {
            this.socket.emit(
                'startScreenShare',
                {
                    roomId: this.roomId!,
                    transportId: this.sendTransport!.id,
                    kind: 'video', // Screen share is always video
                    rtpParameters: {}, // Server will provide these if needed, or client can generate if producer-side
                    appData: payload.appData,
                },
                (response: { producerId?: string; error?: string }) => {
                    if (response.error || !response.producerId) {
                        console.error(
                            'Error producing screen share on server:',
                            response.error
                        );
                        reject(
                            new Error(
                                response.error ||
                                    'Screen share producer ID not returned'
                            )
                        );
                    } else {
                        console.log(
                            'Screen share produced successfully on server, producerId:',
                            response.producerId
                        );
                        // Unlike webcam/mic, screen share producers might be managed more dynamically
                        // and not stored directly in this.producers if they have a different lifecycle.
                        // Or, store them with a special key e.g. this.producers.set('screen-video', producerInstance);
                        // For now, we just return the ID, context will manage the producer instance if needed.
                        resolve(response.producerId);
                    }
                }
            );
        });
    }

    public async closeScreenShareProducer(
        producerId: string,
        currentRoomId: string
    ): Promise<void> {
        if (!producerId || !currentRoomId) {
            console.warn(
                'Missing producerId or roomId for closing screen share producer.'
            );
            return Promise.resolve();
        }
        console.log(
            `Requesting server to close screen share producer: ${producerId} in room ${currentRoomId}`
        );

        // Close the local producer instance if it's stored in this.producers
        // This might be more complex if screen share producers are stored differently.
        // For example, if you stored it like: this.producers.get('screen-video');
        const screenProducer = Array.from(this.producers.values()).find(
            (p) => p.id === producerId && p.appData.type === 'screen'
        );
        if (screenProducer) {
            screenProducer.close(); // Close it locally
            // Decide if we need to remove it from the map. If server confirms, it will be removed.
            // For now, let's assume server confirmation handles map removal via 'producerClosed' from chat-service.
            console.log(`Local screen share producer ${producerId} closed.`);
        }

        return new Promise<void>((resolve, reject) => {
            this.socket.emit(
                'stopScreenShare',
                { roomId: currentRoomId, producerId },
                (response: { error?: string }) => {
                    if (response.error) {
                        console.error(
                            `Error stopping screen share producer ${producerId} on server:`,
                            response.error
                        );
                        reject(new Error(response.error));
                    } else {
                        console.log(
                            `Screen share producer ${producerId} successfully stopped on server.`
                        );
                        resolve();
                    }
                }
            );
        });
    }

    public close(): void {
        console.log('Closing WebRTCClient...');
        if (this.sendTransport) {
            this.sendTransport.close();
            this.sendTransport = null;
        }
        if (this.recvTransport) {
            this.recvTransport.close();
            this.recvTransport = null;
        }
        this.producers.forEach((p) => p.close());
        this.producers.clear();
        this.consumers.forEach((c) => c.close());
        this.consumers.clear();

        // this.device = null; // Don't nullify device, it can be reloaded for a new room/call
        this.roomId = null;
        console.log('WebRTCClient closed.');
    }

    public isProducing(kind: 'audio' | 'video'): boolean {
        return !!this.producers.get(kind)?.track;
    }

    public pauseProducer(kind: 'audio' | 'video'): void {
        const producer = this.producers.get(kind);
        if (producer && !producer.paused) {
            producer.pause();
            console.log(`${kind} producer paused`);
        }
    }

    public resumeProducer(kind: 'audio' | 'video'): void {
        const producer = this.producers.get(kind);
        if (producer && producer.paused) {
            producer.resume();
            console.log(`${kind} producer resumed`);
        }
    }

    public replaceTrack(
        kind: 'audio' | 'video',
        newTrack: MediaStreamTrack | null
    ): Promise<void> {
        const producer = this.producers.get(kind);
        if (!producer) {
            console.warn(
                `No producer found for kind ${kind} to replace track.`
            );
            // If no producer exists, and newTrack is provided, maybe create one?
            if (newTrack) {
                return this.produce(newTrack).then(() => {});
            }
            return Promise.resolve();
        }
        if (!newTrack) {
            // If newTrack is null, it means we want to stop sending this kind of track
            console.log(
                `Stopping ${kind} producer by replacing track with null.`
            );
            this.closeProducer(kind); // Or producer.pause() and signal mute
            return Promise.resolve();
        }
        console.log(`Replacing ${kind} track for producer ${producer.id}`);
        return producer
            .replaceTrack({ track: newTrack })
            .then(() => console.log(`${kind} track replaced successfully.`))
            .catch((error) => {
                console.error(`Error replacing ${kind} track:`, error);
                throw error;
            });
    }
}

// Singleton instance (optional, depends on how you manage state)
// export const webrtcClient = new WebRTCClient();
// Using it as a class that's instantiated in VideoCallContext is often cleaner.
