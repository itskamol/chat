import { Server as SocketIOServer } from 'socket.io';
import { RoomService } from '../services/RoomService';
import { WebRTCService } from '../services/WebRTCService';
import { logger } from '../utils';
import {
    AuthenticatedSocket,
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketEvent,
    // C2S Payload types (requests from client)
    JoinRoomPayload,
    LeaveRoomPayload,
    GetRouterRtpCapabilitiesPayload,
    CreateWebRtcTransportPayload,
    ConnectWebRtcTransportPayload,
    ProducePayload,
    ConsumePayload,
    StartScreenSharePayload,
    StopScreenSharePayload,
    // S2C Payload types (events emitted by this controller)
    UserJoinedPayload,
    UserLeftPayload,
    NewProducerPayload,
    // S2C Callback/Response payload types (for client requests)
    JoinRoomResponsePayload,
    LeaveRoomResponsePayload,
    GetRouterRtpCapabilitiesResponsePayload,
    CreateWebRtcTransportResponsePayload,
    ConnectWebRtcTransportResponsePayload,
    ProduceResponsePayload,
    ConsumeResponsePayload,
    StartScreenShareResponsePayload,
    StopScreenShareResponsePayload,
    // Shared WebRTC types
    ProducerInfo,
    RtpCapabilities,
    WebRtcTransportParams,
    DtlsParameters,
    RtpParameters,
    SctpCapabilities,
    ConsumerParams
} from '@shared';

export class WebRTCController {
    constructor(
        private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
        private roomService: RoomService,
        private webrtcService: WebRTCService
    ) {}

    // Signature: (socket, userId, payload)
    public async handleJoinRoom(
        socket: AuthenticatedSocket,
        userId: string,
        payload: JoinRoomPayload
    ): Promise<JoinRoomResponsePayload> {
        try {
            this.roomService.joinRoom(socket, payload.roomId, userId);

            const user = socket.data.user; // For name, avatar if available
            const userJoinedPayload: UserJoinedPayload = {
                userId,
                roomId: payload.roomId,
                name: user?.name,
                avatarUrl: user?.avatarUrl,
                socketId: socket.id
            };
            socket.to(payload.roomId).emit(SocketEvent.USER_JOINED, userJoinedPayload);

            const activeProducers = this.roomService
                .getActiveProducers(payload.roomId)
                .map((p: ProducerInfo) => ({ // Ensure p is ProducerInfo from @shared
                    producerId: p.producerId,
                    userId: p.userId,
                    kind: p.kind,
                    appData: p.appData,
                    // Map other fields if ProducerInfo in RoomService is different from shared ProducerInfo
                }));
            
            logger.info(
                `User ${userId} joined room ${payload.roomId}. Active producers: ${activeProducers.length}`,
                { socketId: socket.id }
            );
            return { activeProducers };
        } catch (error: any) {
            logger.error(`Error in joinRoom for user ${userId}, room ${payload.roomId}:`, error);
            return { error: 'Failed to join room: ' + error.message };
        }
    }

    public async handleLeaveRoom(
        socket: AuthenticatedSocket,
        userId: string,
        payload: LeaveRoomPayload
    ): Promise<LeaveRoomResponsePayload> {
        try {
            await this.roomService.leaveRoom(socket, payload.roomId, userId);
            const userLeftPayload: UserLeftPayload = { userId, roomId: payload.roomId, socketId: socket.id };
            socket.to(payload.roomId).emit(SocketEvent.USER_LEFT, userLeftPayload);
            return {};
        } catch (error: any) {
            logger.error(`Error in leaveRoom for user ${userId}, room ${payload.roomId}:`, error);
            return { error: 'Failed to leave room: ' + error.message };
        }
    }

    public async handleGetRtpCapabilities(
        socket: AuthenticatedSocket,
        userId: string, // Though not directly used by webrtcService method here, good for consistency
        payload: GetRouterRtpCapabilitiesPayload
    ): Promise<GetRouterRtpCapabilitiesResponsePayload> {
        try {
            const rtpCapabilities = await this.webrtcService.handleGetRtpCapabilities(socket, payload.roomId);
            // Assuming handleGetRtpCapabilities returns RtpCapabilities directly or throws
            return { rtpCapabilities };
        } catch (error: any) {
            logger.error(`Error getting RTP capabilities for room ${payload.roomId}:`, error);
            return { error: 'Failed to get router RTP capabilities: ' + error.message };
        }
    }

    public async handleCreateTransport(
        socket: AuthenticatedSocket,
        userId: string,
        payload: CreateWebRtcTransportPayload
    ): Promise<CreateWebRtcTransportResponsePayload> {
        try {
            const transportOptions = await this.webrtcService.handleCreateTransport(
                socket,
                payload.roomId,
                payload.producing,
                payload.consuming,
                payload.sctpCapabilities
            );
            return { transportOptions };
        } catch (error: any) {
            logger.error(`Error creating transport for room ${payload.roomId}:`, error);
            return { error: 'Failed to create WebRTC transport: ' + error.message };
        }
    }

    public async handleConnectTransport(
        socket: AuthenticatedSocket,
        userId: string,
        payload: ConnectWebRtcTransportPayload
    ): Promise<ConnectWebRtcTransportResponsePayload> {
        try {
            await this.webrtcService.handleConnectTransport(
                socket,
                payload.roomId,
                payload.transportId,
                payload.dtlsParameters
            );
            return {}; // Success is an empty object for this response
        } catch (error: any) {
            logger.error(`Error connecting transport ${payload.transportId} for room ${payload.roomId}:`, error);
            return { error: 'Failed to connect WebRTC transport: ' + error.message };
        }
    }

    public async handleProduce(
        socket: AuthenticatedSocket,
        userId: string,
        payload: ProducePayload
    ): Promise<ProduceResponsePayload> {
        try {
            const producerId = await this.webrtcService.handleProduce(
                socket,
                payload.roomId,
                payload.transportId,
                payload.kind,
                payload.rtpParameters,
                payload.appData,
                userId // Pass userId to service
            );

            const user = socket.data.user;
            const newProducerPayload: NewProducerPayload = {
                roomId: payload.roomId,
                producerId,
                userId,
                name: user?.name,
                avatarUrl: user?.avatarUrl,
                kind: payload.kind,
                appData: payload.appData,
                socketId: socket.id,
            };
            socket.to(payload.roomId).emit(SocketEvent.NEW_PRODUCER, newProducerPayload);
            return { producerId };
        } catch (error: any) {
            logger.error(`Error producing ${payload.kind} for room ${payload.roomId}:`, error);
            return { error: `Failed to produce ${payload.kind}: ` + error.message };
        }
    }
    
    public async handleConsume(
        socket: AuthenticatedSocket,
        userId: string, // User performing the consume action
        payload: ConsumePayload
    ): Promise<ConsumeResponsePayload> {
        try {
            const consumerOptions = await this.webrtcService.handleConsume(
                socket,
                payload.roomId,
                payload.transportId,
                payload.producerId,
                payload.rtpCapabilities,
                userId // Pass consuming user's ID
            );
            return { consumerOptions };
        } catch (error: any) {
            logger.error(`Error consuming producer ${payload.producerId} for room ${payload.roomId}:`, error);
            return { error: 'Failed to consume producer: ' + error.message };
        }
    }

    public async handleStartScreenShare(
        socket: AuthenticatedSocket,
        userId: string,
        payload: StartScreenSharePayload
    ): Promise<StartScreenShareResponsePayload> {
        try {
            // Assuming kind is 'video' and appData includes { type: 'screen' }
            const producerId = await this.webrtcService.handleScreenShare( // Or a more generic 'handleProduce' if screen share is not special in service
                socket,
                payload.roomId,
                payload.transportId,
                'video', // kind is video for screen share
                payload.rtpParameters,
                payload.appData || { type: 'screen' }, // Ensure appData indicates screen share
                userId
            );
            
            const user = socket.data.user;
            const newProducerPayload: NewProducerPayload = {
                roomId: payload.roomId,
                producerId,
                userId,
                name: user?.name,
                avatarUrl: user?.avatarUrl,
                kind: 'video',
                appData: payload.appData || { type: 'screen' },
                socketId: socket.id,
            };
            socket.to(payload.roomId).emit(SocketEvent.NEW_PRODUCER, newProducerPayload);
            return { producerId };
        } catch (error: any) {
            logger.error(`Error starting screen share for room ${payload.roomId}:`, error);
            return { error: 'Failed to start screen share: ' + error.message };
        }
    }

    public async handleStopScreenShare(
        socket: AuthenticatedSocket,
        userId: string, // User stopping their own screen share
        payload: StopScreenSharePayload
    ): Promise<StopScreenShareResponsePayload> {
        try {
            await this.webrtcService.handleStopScreenShare( // This service method might also emit PRODUCER_CLOSED
                socket,
                payload.roomId,
                payload.producerId
                // userId might be needed in service for validation
            );
            // PRODUCER_CLOSED event for this producerId should be emitted by WebRTCService or RoomService
            // after successfully stopping/closing the producer.
            return {};
        } catch (error: any) {
            logger.error(`Error stopping screen share producer ${payload.producerId} for room ${payload.roomId}:`, error);
            return { error: 'Failed to stop screen share: ' + error.message };
        }
    }
}
