// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DtlsParameters = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RtpCapabilities = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RtpParameters = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SctpCapabilities = any;

export interface WebRtcTransportParams {
  id: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: DtlsParameters;
  sctpCapabilities?: SctpCapabilities;
}

export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData?: Record<string, unknown>;
}

export interface SignalingEvents {
  // Client to Server
  joinRoom: (payload: { roomId: string }, callback: (data: { error?: string, activeProducers?: { producerId: string, kind: 'audio' | 'video', userId: string, appData?: Record<string, unknown> }[] }) => void) => void;
  leaveRoom: (payload: { roomId: string }, callback?: (data: { error?: string }) => void) => void;
  getRouterRtpCapabilities: (payload: { roomId: string }, callback: (data: RtpCapabilities | { error: string }) => void) => void;
  createWebRtcTransport: (
    payload: { roomId: string; producing: boolean; consuming: boolean; sctpCapabilities?: SctpCapabilities },
    callback: (data: WebRtcTransportParams | { error: string }) => void
  ) => void;
  connectWebRtcTransport: (
    payload: { roomId: string; transportId: string; dtlsParameters: DtlsParameters },
    callback: (data: { error?: string }) => void
  ) => void;
  produce: (
    payload: { roomId: string; transportId: string; kind: 'audio' | 'video'; rtpParameters: RtpParameters; appData?: Record<string, unknown> },
    callback: (data: { producerId?: string; error?: string }) => void
  ) => void;
  startScreenShare: (
    payload: { roomId: string; transportId: string; kind: 'video'; rtpParameters: RtpParameters; appData: { type: 'screen', [key: string]: any } },
    callback: (data: { producerId?: string; error?: string }) => void
  ) => void;
  stopScreenShare: (
    payload: { roomId: string; producerId: string },
    callback: (data: { error?: string }) => void
  ) => void;
  consume: (
    payload: { roomId: string; transportId: string; producerId: string; rtpCapabilities: RtpCapabilities },
    callback: (data: ConsumerParams | { error: string }) => void
  ) => void;
  // Server to Client
  userJoined: (payload: { userId: string; socketId: string }) => void;
  userLeft: (payload: { userId: string; socketId: string }) => void;
  newProducer: (payload: { producerId: string; userId: string; kind: 'audio' | 'video'; appData?: Record<string, unknown>; socketId: string }) => void;
  producerClosed: (payload: { producerId: string; userId: string; socketId: string }) => void;
  activeProducers: (payload: { producerId: string, kind: 'audio' | 'video', userId: string, appData?: Record<string, unknown> }[]) => void; // Sent upon joining a room with active producers
  transportProduceDone: (payload: { transportId: string; producerId: string }) => void; // Server confirms transport is ready for producing
  transportConsumeDone: (payload: { transportId: string; consumerId: string; producerId: string; kind: 'audio' | 'video'; rtpParameters: RtpParameters; appData?: Record<string, unknown> }) => void; // Server confirms transport is ready for consuming and provides consumer params
}

// For storing producer info on server-side (chat-service)
export interface ProducerInfo {
  producerId: string;
  userId: string;
  socketId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters; // May not be needed here long-term, but good for reference
  appData?: { type?: 'webcam' | 'screen', [key: string]: any }; // Updated appData
  transportId: string; // Store the transportId associated with this producer
}

// For storing transport info on server-side (chat-service)
export interface TransportInfo {
  transportId: string;
  userId: string;
  socketId: string;
  producing: boolean;
  consuming: boolean;
  // We might store producerIds and consumerIds associated with this transport here
  producerIds: Set<string>;
  consumerIds: Set<string>;
}

export interface RoomState {
  id: string;
  sockets: Set<string>; // Store socket IDs
  users: Map<string, string>; // Map socketId to userId
  producers: Map<string, ProducerInfo>; // Map producerId to ProducerInfo
  // We might also store router info if fetched, or just rely on media-server
}

// Define the media-server API endpoints and their expected request/response shapes
export const MEDIA_SERVER_API_BASE_URL = process.env.MEDIA_SERVER_URL || 'http://media_server_container:3001';

export const MediaServerApiEndpoints = {
  getRouterRtpCapabilities: (roomId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/router-rtp-capabilities`,
  createTransport: (roomId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/transports`,
  connectTransport: (roomId: string, transportId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/transports/${transportId}/connect`,
  produce: (roomId: string, transportId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/transports/${transportId}/produce`,
  consume: (roomId: string, transportId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/transports/${transportId}/consume`,
  closeProducer: (roomId: string, producerId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/producers/${producerId}/close`, // New, for cleanup
  closeTransport: (roomId: string, transportId: string) => `${MEDIA_SERVER_API_BASE_URL}/rooms/${roomId}/transports/${transportId}/close`, // New, for cleanup
};

// Expected request/response for media-server (for chat-service to use with fetch)
// GET /rooms/{roomId}/router-rtp-capabilities -> RtpCapabilities
// POST /rooms/{roomId}/transports (body: { producing: boolean, consuming: boolean, sctpCapabilities?: any }) -> WebRtcTransportParams
// POST /rooms/{roomId}/transports/{transportId}/connect (body: { dtlsParameters: any }) -> { connected: true } or error
// POST /rooms/{roomId}/transports/{transportId}/produce (body: { kind: string, rtpParameters: any, appData?: any }) -> { id: string } (producerId)
// POST /rooms/{roomId}/transports/{transportId}/consume (body: { producerId: string, rtpCapabilities: any }) -> ConsumerParams
// POST /rooms/{roomId}/producers/{producerId}/close -> { closed: true }
// POST /rooms/{roomId}/transports/{transportId}/close -> { closed: true }

// export {}; // Make this a module
