import { Socket } from 'socket.io';
import { MediaServerClient } from './MediaServerClient';
import { RoomService } from './RoomService';
import { DtlsParameters, RtpCapabilities, RtpParameters, WebRtcTransportParams, ConsumerParams } from '../types/signaling.types';
import { logger } from '../utils';

export class WebRTCService {
    constructor(
        private roomService: RoomService,
        private mediaServer: MediaServerClient
    ) {}

    public async handleGetRtpCapabilities(socket: Socket, roomId: string): Promise<RtpCapabilities> {
        try {
            return await this.mediaServer.getRouterRtpCapabilities(roomId);
        } catch (error) {
            logger.error(`Error getting RTP capabilities for room ${roomId}:`, error);
            throw error;
        }
    }

    public async handleCreateTransport(
        socket: Socket,
        roomId: string,
        producing: boolean,
        consuming: boolean,
        sctpCapabilities?: any
    ): Promise<WebRtcTransportParams> {
        try {
            return await this.mediaServer.createTransport(roomId, producing, consuming, sctpCapabilities);
        } catch (error) {
            logger.error(`Error creating transport in room ${roomId}:`, error);
            throw error;
        }
    }

    public async handleConnectTransport(
        socket: Socket,
        roomId: string,
        transportId: string,
        dtlsParameters: DtlsParameters
    ): Promise<void> {
        try {
            await this.mediaServer.connectTransport(roomId, transportId, dtlsParameters);
        } catch (error) {
            logger.error(`Error connecting transport ${transportId} in room ${roomId}:`, error);
            throw error;
        }
    }

    public async handleProduce(
        socket: Socket,
        roomId: string,
        transportId: string,
        kind: 'audio' | 'video',
        rtpParameters: RtpParameters,
        appData?: any,
        userId?: string
    ): Promise<string> {
        try {
            // Add socket and user info to appData
            const enrichedAppData = {
                ...appData,
                socketId: socket.id,
                userId
            };

            const { id: producerId } = await this.mediaServer.produce(
                roomId,
                transportId,
                kind,
                rtpParameters,
                enrichedAppData
            );

            // Store producer info in room state
            this.roomService.addProducer(roomId, {
                producerId,
                userId: userId!,
                socketId: socket.id,
                kind,
                rtpParameters,
                appData: enrichedAppData,
                transportId
            });

            return producerId;
        } catch (error) {
            logger.error(`Error producing ${kind} in room ${roomId}:`, error);
            throw error;
        }
    }

    public async handleConsume(
        socket: Socket,
        roomId: string,
        transportId: string,
        producerId: string,
        rtpCapabilities: RtpCapabilities,
        userId: string
    ): Promise<ConsumerParams> {
        try {
            return await this.mediaServer.consume(roomId, transportId, producerId, rtpCapabilities, userId);
        } catch (error) {
            logger.error(`Error consuming producer ${producerId} in room ${roomId}:`, error);
            throw error;
        }
    }

    public async handleScreenShare(
        socket: Socket,
        roomId: string,
        transportId: string,
        kind: 'video',
        rtpParameters: RtpParameters,
        appData: { type: 'screen' } & Record<string, any>,
        userId: string
    ): Promise<string> {
        return this.handleProduce(socket, roomId, transportId, kind, rtpParameters, appData, userId);
    }

    public async handleStopScreenShare(
        socket: Socket,
        roomId: string,
        producerId: string
    ): Promise<void> {
        try {
            await this.mediaServer.closeProducer(roomId, producerId);
            this.roomService.removeProducer(roomId, producerId);
        } catch (error) {
            logger.error(`Error stopping screen share producer ${producerId} in room ${roomId}:`, error);
            throw error;
        }
    }
}
