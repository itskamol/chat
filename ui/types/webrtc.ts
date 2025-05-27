// WebRTC types for the UI layer
export type RtpCapabilities = any;
export type RtpParameters = any;
export type DtlsParameters = any;
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

export interface ProducerInfo {
    producerId: string;
    userId: string;
    socketId: string;
    kind: 'audio' | 'video';
    rtpParameters: RtpParameters;
    appData?: Record<string, unknown>;
    transportId: string;
}
