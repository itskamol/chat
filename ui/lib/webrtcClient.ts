import * as mediasoupClient from 'mediasoup-client';
import {
    getRtpCapabilities,
    createTransport,
    connectTransport,
    produce,
    consume,
    getSocket,
    stopScreenShare,
    startScreenShare,
} from './socket';
import { ConsumerParams, RtpCapabilities, WebRtcTransportParams } from '@chat/shared';

export class WebRTCClient {
    private device: mediasoupClient.types.Device | null = null;
    private sendTransport: mediasoupClient.types.Transport | null = null;
    private recvTransport: mediasoupClient.types.Transport | null = null;
    private producers: Map<string, mediasoupClient.types.Producer> = new Map();
    private consumers: Map<string, mediasoupClient.types.Consumer> = new Map();
    private roomId: string | null = null;
    private socket = getSocket();

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
            this.roomId = currentRoomId;
            return;
        }
        this.roomId = currentRoomId;

        try {
            const routerRtpCapabilities = await getRtpCapabilities(this.roomId);
            
            if ('error' in routerRtpCapabilities) {
                throw new Error(`Failed to get Router RTP Capabilities: ${routerRtpCapabilities.error}`);
            }

            this.device = new mediasoupClient.Device();
            await this.device.load({
                routerRtpCapabilities: routerRtpCapabilities as RtpCapabilities,
            });
            
            console.log('Mediasoup device loaded successfully');
        } catch (error) {
            console.error('Error loading mediasoup device:', error);
            throw error;
        }
    }

    public async createSendTransport(): Promise<mediasoupClient.types.Transport> {
        if (!this.device) throw new Error('Device not loaded');
        if (!this.roomId) throw new Error('Room ID not set for send transport');

        try {
            const transportParams = await createTransport({
                roomId: this.roomId,
                producing: true,
                consuming: false,
                sctpCapabilities: this.device.sctpCapabilities,
            });

            if ('error' in transportParams) {
                throw new Error(transportParams.error);
            }

            const params = transportParams as WebRtcTransportParams;
            const transportOptions: mediasoupClient.types.TransportOptions = {
                id: params.id,
                iceParameters: params.iceParameters as mediasoupClient.types.IceParameters,
                iceCandidates: params.iceCandidates as mediasoupClient.types.IceCandidate[],
                dtlsParameters: params.dtlsParameters as mediasoupClient.types.DtlsParameters,
                sctpParameters: params.sctpCapabilities as mediasoupClient.types.SctpParameters | undefined,
            };

            this.sendTransport = this.device.createSendTransport(transportOptions);
            console.log('Send transport created:', this.sendTransport.id);

            this.sendTransport.on(
                'connect',
                async ({ dtlsParameters }, callback, errback) => {
                    try {
                        await connectTransport({
                            roomId: this.roomId!,
                            transportId: this.sendTransport!.id,
                            dtlsParameters,
                        });
                        console.log('Send transport connected successfully on server');
                        callback();
                    } catch (error: any) {
                        console.error('Error connecting send transport:', error);
                        errback(error);
                    }
                }
            );

            this.sendTransport.on(
                'produce',
                async ({ kind, rtpParameters, appData }, callback, errback) => {
                    try {
                        const response = await produce({
                            roomId: this.roomId!,
                            transportId: this.sendTransport!.id,
                            kind,
                            rtpParameters,
                            appData,
                        });

                        if ('error' in response || !('id' in response)) {
                            throw new Error(response.error || 'Producer ID not returned');
                        }

                        console.log(`${kind} produced successfully on server, producerId:`, response);
                        callback({ id: (response as { id: string }).id });
                    } catch (error: any) {
                        console.error(`Error producing ${kind} on server:`, error);
                        errback(error);
                    }
                }
            );

            this.sendTransport.on('connectionstatechange', (state) => {
                console.log(`Send transport connection state: ${state}`);
                if (state === 'failed') {
                    console.error('Send transport connection failed');
                }
            });

            return this.sendTransport;
        } catch (error) {
            console.error('Error creating send transport:', error);
            throw error;
        }
    }

    public async createRecvTransport(): Promise<mediasoupClient.types.Transport> {
        if (!this.device) throw new Error('Device not loaded');
        if (!this.roomId) throw new Error('Room ID not set for recv transport');

        try {
            const transportParams = await createTransport({
                roomId: this.roomId,
                producing: false,
                consuming: true,
                sctpCapabilities: this.device.sctpCapabilities,
            });

            if ('error' in transportParams) {
                throw new Error(transportParams.error);
            }

            const params = transportParams as WebRtcTransportParams;
            const transportOptions: mediasoupClient.types.TransportOptions = {
                id: params.id,
                iceParameters: params.iceParameters as mediasoupClient.types.IceParameters,
                iceCandidates: params.iceCandidates as mediasoupClient.types.IceCandidate[],
                dtlsParameters: params.dtlsParameters as mediasoupClient.types.DtlsParameters,
                sctpParameters: params.sctpCapabilities as mediasoupClient.types.SctpParameters | undefined,
            };

            this.recvTransport = this.device.createRecvTransport(transportOptions);
            console.log('Recv transport created:', this.recvTransport.id);

            this.recvTransport.on(
                'connect',
                async ({ dtlsParameters }, callback, errback) => {
                    try {
                        await connectTransport({
                            roomId: this.roomId!,
                            transportId: this.recvTransport!.id,
                            dtlsParameters,
                        });
                        console.log('Recv transport connected successfully on server');
                        callback();
                    } catch (error: any) {
                        console.error('Error connecting recv transport:', error);
                        errback(error);
                    }
                }
            );

            this.recvTransport.on('connectionstatechange', (state) => {
                console.log(`Recv transport connection state: ${state}`);
                if (state === 'failed') {
                    console.error('Receive transport connection failed');
                }
            });

            return this.recvTransport;
        } catch (error) {
            console.error('Error creating recv transport:', error);
            throw error;
        }
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
            appData: { ...appData, trackKind: track.kind },
        });

        this.producers.set(track.kind, producer);
        console.log(`${track.kind} producer created:`, producer.id, 'appData:', producer.appData);

        producer.on('trackended', () => {
            console.log(`${track.kind} track ended`);
            if (track.kind === 'audio' || track.kind === 'video') {
                this.closeProducer(track.kind);
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
    ): Promise<ConsumerParams | null> {
        if (!this.recvTransport) {
            throw new Error('Receive transport not created');
        }

        try {
            const consumerParams = await consume({
                roomId: this.roomId!,
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities,
            });

            if ('error' in consumerParams || !consumerParams.id) {
                throw new Error(
                    'error' in consumerParams
                        ? consumerParams.error
                        : 'Failed to get consumer parameters'
                );
            }

            const typedParams = consumerParams as ConsumerParams;

            const consumer = await this.recvTransport.consume({
                id: typedParams.id,
                producerId: typedParams.producerId,
                kind: typedParams.kind,
                rtpParameters: typedParams.rtpParameters,
                appData: {
                    ...typedParams.appData,
                    consumingUserId: 'self',
                },
            });

            this.consumers.set(consumer.id, consumer);
            console.log(`${typedParams.kind} consumer created:`, consumer.id, 'for producer:', typedParams.producerId);

            consumer.on('trackended', () => {
                console.log(`Track ended for consumer ${consumer.id}`);
                this.closeConsumer(consumer.id);
            });

            consumer.on('transportclose', () => {
                console.log(`Transport closed for consumer ${consumer.id}`);
                this.consumers.delete(consumer.id);
            });

            return {
                appData: typedParams.appData,
                id: consumer.id,
                producerId: typedParams.producerId,
                kind: typedParams.kind,
                track: consumer.track,
                rtpParameters: typedParams.rtpParameters,
            };
        } catch (error) {
            console.error('Error creating consumer:', error);
            throw error;
        }
    }

    public closeProducer(kind: 'audio' | 'video'): void {
        const producer = this.producers.get(kind);
        if (producer) {
            console.log(`Closing ${kind} producer:`, producer.id);
            producer.close();
            this.producers.delete(kind);
        }
    }

    public closeConsumer(consumerId: string): void {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            console.log('Closing consumer:', consumer.id);
            consumer.close();
            this.consumers.delete(consumerId);
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
        if (!this.sendTransport) throw new Error('Send transport not created for screen share');
        if (!this.roomId) throw new Error('Room ID not set for screen share');
        if (!payload.track) throw new Error('Screen share track is required');

        console.log('Attempting to produce screen share track:', payload.track);

        try {
            // First, create the mediasoup producer for the screen share track
            const producer = await this.sendTransport.produce({
                track: payload.track,
                appData: { 
                    ...payload.appData, 
                    type: 'screen',
                    trackKind: payload.track.kind 
                },
            });

            // Store the producer with a screen-specific key
            this.producers.set(`screen-${producer.id}`, producer);
            console.log('Screen share producer created locally:', producer.id);

            // Now notify the server about the screen share
            const response: { id: string } | { error: string } = await startScreenShare({
                roomId: this.roomId,
                transportId: this.sendTransport.id,
                kind: 'video',
                rtpParameters: producer.rtpParameters,
                appData: payload.appData,
            });

            if ('error' in response || !('id' in response)) {
                // If server registration fails, clean up the local producer
                producer.close();
                this.producers.delete(`screen-${producer.id}`);
                throw new Error(response.error || 'Screen share producer ID not returned');
            }

            console.log('Screen share registered with server successfully:', response.id);

            // Set up event handlers for the screen share producer
            producer.on('trackended', () => {
                console.log('Screen share track ended');
                this.closeScreenShareProducer(producer.id, this.roomId!);
            });

            producer.on('transportclose', () => {
                console.log('Transport closed for screen share producer');
                this.producers.delete(`screen-${producer.id}`);
            });

            return response.id;
        } catch (error) {
            console.error('Error producing screen share:', error);
            throw error;
        }
    }

    public async closeScreenShareProducer(
        producerId: string,
        currentRoomId: string
    ): Promise<void> {
        if (!producerId || !currentRoomId) {
            console.warn('Missing producerId or roomId for closing screen share producer.');
            return;
        }

        // Find and close the local screen share producer
        const screenProducerKey = `screen-${producerId}`;
        const screenProducer = this.producers.get(screenProducerKey) || 
                             Array.from(this.producers.values()).find(
                                 (p) => p.id === producerId && p.appData.type === 'screen'
                             );
        
        if (screenProducer) {
            screenProducer.close();
            this.producers.delete(screenProducerKey);
            console.log(`Local screen share producer ${producerId} closed.`);
        }

        try {
            // Notify the server to stop the screen share
            const response: any = await stopScreenShare({
                roomId: currentRoomId,
                producerId,
            });

            if ('error' in response) {
                throw new Error(response.error);
            }

            console.log(`Screen share producer ${producerId} successfully stopped on server.`);
        } catch (error) {
            console.error('Error stopping screen share on server:', error);
            throw error;
        }
    }

    // Method to start screen sharing from a MediaStream
    public async startScreenSharing(stream: MediaStream): Promise<string> {
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
            throw new Error('No video track found in screen share stream');
        }

        return this.produceScreenShare({
            track: videoTrack,
            appData: {
                type: 'screen',
                source: 'screen-share',
            },
        });
    }

    // Method to stop all screen sharing
    public async stopScreenSharing(): Promise<void> {
        const screenProducers = Array.from(this.producers.entries()).filter(
            ([key, producer]) => key.startsWith('screen-') || producer.appData.type === 'screen'
        );

        for (const [key, producer] of screenProducers) {
            await this.closeScreenShareProducer(producer.id, this.roomId!);
        }
    }

    // Method to check if currently screen sharing
    public isScreenSharing(): boolean {
        return Array.from(this.producers.values()).some(
            (producer) => producer.appData.type === 'screen'
        );
    }

    // Get all screen share producer IDs
    public getScreenShareProducerIds(): string[] {
        return Array.from(this.producers.values())
            .filter((producer) => producer.appData.type === 'screen')
            .map((producer) => producer.id);
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
            if (newTrack) {
                return this.produce(newTrack).then(() => {});
            }
            return Promise.resolve();
        }
        if (!newTrack) {
            this.closeProducer(kind);
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