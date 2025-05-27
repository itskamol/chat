import { 
    AuthenticatedSocket, 
    SocketEvent,
    // Import all necessary C2S payload types for WebRTC
    JoinRoomPayload,
    LeaveRoomPayload,
    GetRouterRtpCapabilitiesPayload,
    CreateWebRtcTransportPayload,
    ConnectWebRtcTransportPayload,
    ProducePayload,
    ConsumePayload,
    StartScreenSharePayload,
    StopScreenSharePayload,
    // Import all necessary S2C callback/response payload types for WebRTC
    JoinRoomResponsePayload,
    LeaveRoomResponsePayload,
    GetRouterRtpCapabilitiesResponsePayload,
    CreateWebRtcTransportResponsePayload,
    ConnectWebRtcTransportResponsePayload,
    ProduceResponsePayload,
    ConsumeResponsePayload,
    StartScreenShareResponsePayload,
    StopScreenShareResponsePayload
} from '@shared';
import { WebRTCController } from '../../controllers/WebRTCController';
import { logger } from '../../utils'; // Added logger for safety

export const setupWebRTCHandlers = (
    socket: AuthenticatedSocket,
    webrtcController: WebRTCController
    // userId: string // userId will be obtained from socket.data.user.id
): void => {
    if (!socket.data.user || !socket.data.user.id) {
        logger.error('User not authenticated or user ID missing in socket data for WebRTC handlers.');
        socket.emit(SocketEvent.ERROR, { message: 'Authentication error: Cannot register WebRTC handlers.' });
        return;
    }
    const userId = socket.data.user.id;

    // Room management
    socket.on(SocketEvent.JOIN_ROOM, async (payload: JoinRoomPayload, callback: (response: JoinRoomResponsePayload) => void) => {
        const result = await webrtcController.handleJoinRoom(socket, userId, payload);
        callback(result);
    });

    socket.on(SocketEvent.LEAVE_ROOM, async (payload: LeaveRoomPayload, callback: (response: LeaveRoomResponsePayload) => void) => {
        const result = await webrtcController.handleLeaveRoom(socket, userId, payload);
        // Original code had: if (callback) callback(result);
        // Socket.IO typing for ack implies callback is always present if defined in event type.
        callback(result); 
    });

    // WebRTC capabilities
    socket.on(SocketEvent.GET_ROUTER_RTP_CAPABILITIES, async (payload: GetRouterRtpCapabilitiesPayload, callback: (response: GetRouterRtpCapabilitiesResponsePayload) => void) => {
        const result = await webrtcController.handleGetRtpCapabilities(socket, userId, payload);
        callback(result);
    });

    // Transport management
    socket.on(SocketEvent.CREATE_WEBRTC_TRANSPORT, async (payload: CreateWebRtcTransportPayload, callback: (response: CreateWebRtcTransportResponsePayload) => void) => {
        const result = await webrtcController.handleCreateTransport(socket, userId, payload);
        callback(result);
    });

    socket.on(SocketEvent.CONNECT_WEBRTC_TRANSPORT, async (payload: ConnectWebRtcTransportPayload, callback: (response: ConnectWebRtcTransportResponsePayload) => void) => {
        const result = await webrtcController.handleConnectTransport(socket, userId, payload);
        callback(result);
    });

    // Media handling
    socket.on(SocketEvent.PRODUCE, async (payload: ProducePayload, callback: (response: ProduceResponsePayload) => void) => {
        const result = await webrtcController.handleProduce(socket, userId, payload);
        callback(result);
    });

    socket.on(SocketEvent.CONSUME, async (payload: ConsumePayload, callback: (response: ConsumeResponsePayload) => void) => {
        const result = await webrtcController.handleConsume(socket, userId, payload);
        callback(result);
    });

    // Screen sharing
    socket.on(SocketEvent.START_SCREEN_SHARE, async (payload: StartScreenSharePayload, callback: (response: StartScreenShareResponsePayload) => void) => {
        // Note: The original handler had (payload, callback) where payload was deconstructed.
        // Now payload is a single object. Controller needs to adapt.
        const result = await webrtcController.handleStartScreenShare(socket, userId, payload);
        callback(result);
    });

    socket.on(SocketEvent.STOP_SCREEN_SHARE, async (payload: StopScreenSharePayload, callback: (response: StopScreenShareResponsePayload) => void) => {
        const result = await webrtcController.handleStopScreenShare(socket, userId, payload);
        callback(result);
    });
};
