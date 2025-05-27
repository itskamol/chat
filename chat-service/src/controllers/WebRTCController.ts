import { Server as SocketIOServer } from 'socket.io';
import { RoomService } from '../services/RoomService';
import { WebRTCService } from '../services/WebRTCService';
import { logger } from '../utils';
import {
    RoomJoinRequest,
    RoomJoinResponse,
    RoomLeaveRequest,
    RoomLeaveResponse,
} from '../types/room.types';
import { AuthenticatedSocket } from '@chat/shared';

export class WebRTCController {
    constructor(
        private io: SocketIOServer,
        private roomService: RoomService,
        private webrtcService: WebRTCService
    ) {}

    public async handleJoinRoom(
        socket: AuthenticatedSocket,
        { roomId }: RoomJoinRequest,
        userId: string
    ): Promise<RoomJoinResponse> {
        try {
            // Join the room
            this.roomService.joinRoom(socket, roomId, userId);

            // Notify other users in the room
            socket.to(roomId).emit('userJoined', {
                userId,
                roomId,
            });

            // Get list of active producers to send to the new participant
            const activeProducers = this.roomService
                .getActiveProducers(roomId)
                .map((p) => ({
                    producerId: p.producerId,
                    userId: p.userId,
                    kind: p.kind,
                    appData: p.appData,
                }));

            logger.info(
                `User ${userId} joined room ${roomId}. Active producers: ${activeProducers.length}`,
                { socketId: socket.id }
            );

            return { activeProducers };
        } catch (error) {
            logger.error(
                `Error in joinRoom for user ${userId}, room ${roomId}:`,
                error
            );
            return { error: 'Failed to join room' };
        }
    }

    public async handleLeaveRoom(
        socket: AuthenticatedSocket,
        { roomId }: RoomLeaveRequest,
        userId: string
    ): Promise<RoomLeaveResponse> {
        try {
            await this.roomService.leaveRoom(socket, roomId, userId);

            // Notify other users in the room if it's an explicit leave
            socket.to(roomId).emit('userLeft', {
                userId,
                roomId
            });

            return {};
        } catch (error) {
            logger.error(
                `Error in leaveRoom for user ${userId}, room ${roomId}:`,
                error
            );
            return { error: 'Failed to leave room' };
        }
    }

    public async handleGetRtpCapabilities(
        socket: AuthenticatedSocket,
        { roomId }: { roomId: string },
        userId: string
    ) {
        try {
            return await this.webrtcService.handleGetRtpCapabilities(
                socket,
                roomId
            );
        } catch (error) {
            return { error: 'Failed to get router RTP capabilities' };
        }
    }

    public async handleCreateTransport(
        socket: AuthenticatedSocket,
        {
            roomId,
            producing,
            consuming,
            sctpCapabilities,
        }: {
            roomId: string;
            producing: boolean;
            consuming: boolean;
            sctpCapabilities?: any;
        },
        userId: string
    ) {
        try {
            return await this.webrtcService.handleCreateTransport(
                socket,
                roomId,
                producing,
                consuming,
                sctpCapabilities
            );
        } catch (error) {
            return { error: 'Failed to create WebRTC transport' };
        }
    }

    public async handleConnectTransport(
        socket: AuthenticatedSocket,
        {
            roomId,
            transportId,
            dtlsParameters,
        }: {
            roomId: string;
            transportId: string;
            dtlsParameters: any;
        },
        userId: string
    ) {
        try {
            await this.webrtcService.handleConnectTransport(
                socket,
                roomId,
                transportId,
                dtlsParameters
            );
            return {};
        } catch (error) {
            return { error: 'Failed to connect WebRTC transport' };
        }
    }

    public async handleProduce(
        socket: AuthenticatedSocket,
        {
            roomId,
            transportId,
            kind,
            rtpParameters,
            appData,
        }: {
            roomId: string;
            transportId: string;
            kind: 'audio' | 'video';
            rtpParameters: any;
            appData?: any;
        },
        userId: string
    ) {
        try {
            const producerId = await this.webrtcService.handleProduce(
                socket,
                roomId,
                transportId,
                kind,
                rtpParameters,
                appData,
                userId
            );

            // Notify other participants about the new producer
            socket.to(roomId).emit('newProducer', {
                producerId,
                userId,
                kind,
                appData,
                socketId: socket.id,
            });

            return { producerId };
        } catch (error) {
            return { error: `Failed to produce ${kind}` };
        }
    }

    public async handleConsume(
        socket: AuthenticatedSocket,
        {
            roomId,
            transportId,
            producerId,
            rtpCapabilities,
        }: {
            roomId: string;
            transportId: string;
            producerId: string;
            rtpCapabilities: any;
        },
        userId: string
    ) {
        try {
            return await this.webrtcService.handleConsume(
                socket,
                roomId,
                transportId,
                producerId,
                rtpCapabilities,
                userId
            );
        } catch (error) {
            return { error: 'Failed to consume producer' };
        }
    }

    public async handleScreenShare(
        socket: AuthenticatedSocket,
        {
            roomId,
            transportId,
            kind,
            rtpParameters,
            appData,
        }: {
            roomId: string;
            transportId: string;
            kind: 'video';
            rtpParameters: any;
            appData: { type: 'screen' } & Record<string, any>;
        },
        userId: string
    ) {
        try {
            const producerId = await this.webrtcService.handleScreenShare(
                socket,
                roomId,
                transportId,
                kind,
                rtpParameters,
                appData,
                userId
            );

            // Notify others about new screen share producer
            socket.to(roomId).emit('newProducer', {
                producerId,
                userId,
                kind,
                appData: { ...appData, type: 'screen' },
                socketId: socket.id,
            });

            return { producerId };
        } catch (error) {
            return { error: 'Failed to start screen share' };
        }
    }

    public async handleStopScreenShare(
        socket: AuthenticatedSocket,
        {
            roomId,
            producerId,
        }: {
            roomId: string;
            producerId: string;
        },
        userId: string
    ) {
        try {
            await this.webrtcService.handleStopScreenShare(
                socket,
                roomId,
                producerId
            );
            return {};
        } catch (error) {
            return { error: 'Failed to stop screen share' };
        }
    }
}
