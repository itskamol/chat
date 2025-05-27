import { AuthenticatedSocket } from '@chat/shared';
import { WebRTCController } from '../../controllers/WebRTCController';

export const setupWebRTCHandlers = (
    socket: AuthenticatedSocket,
    webrtcController: WebRTCController,
    userId: string
): void => {
    // Room management
    socket.on('joinRoom', async ({ roomId }, callback) => {
        const result = await webrtcController.handleJoinRoom(
            socket,
            { roomId },
            userId
        );
        callback(result);
    });

    socket.on('leaveRoom', async ({ roomId }, callback) => {
        const result = await webrtcController.handleLeaveRoom(
            socket,
            { roomId },
            userId
        );
        if (callback) callback(result);
    });

    // WebRTC capabilities
    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        const result = await webrtcController.handleGetRtpCapabilities(
            socket,
            { roomId },
            userId
        );
        callback(result);
    });

    // Transport management
    socket.on(
        'createWebRtcTransport',
        async ({ roomId, producing, consuming, sctpCapabilities }, callback) => {
            const result = await webrtcController.handleCreateTransport(
                socket,
                { roomId, producing, consuming, sctpCapabilities },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'connectWebRtcTransport',
        async ({ roomId, transportId, dtlsParameters }, callback) => {
            const result = await webrtcController.handleConnectTransport(
                socket,
                { roomId, transportId, dtlsParameters },
                userId
            );
            callback(result);
        }
    );

    // Media handling
    socket.on(
        'produce',
        async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
            const result = await webrtcController.handleProduce(
                socket,
                { roomId, transportId, kind, rtpParameters, appData },
                userId
            );
            callback(result);
        }
    );

    socket.on(
        'consume',
        async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
            const result = await webrtcController.handleConsume(
                socket,
                { roomId, transportId, producerId, rtpCapabilities },
                userId
            );
            callback(result);
        }
    );

    // Screen sharing
    socket.on(
        'startScreenShare',
        async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
            const result = await webrtcController.handleScreenShare(
                socket,
                { roomId, transportId, kind, rtpParameters, appData },
                userId
            );
            callback(result);
        }
    );

    socket.on('stopScreenShare', async ({ roomId, producerId }, callback) => {
        const result = await webrtcController.handleStopScreenShare(
            socket,
            { roomId, producerId },
            userId
        );
        callback(result);
    });
};
