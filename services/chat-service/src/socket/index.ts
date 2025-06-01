import { Socket, Server as SocketIOServer } from 'socket.io';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
} from '@chat/shared';

// Socket types
export type AuthenticatedSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

export type SocketIOInstance = SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;

// Re-export handlers for easy access
export { setupBasicHandlers } from './handlers/basicHandlers';
export { setupMessageHandlers } from './handlers/messageHandlers';
export { setupWebRTCHandlers } from './handlers/webrtcHandlers';
