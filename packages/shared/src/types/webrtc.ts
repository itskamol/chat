// Basic WebRTC types (often from mediasoup or native WebRTC APIs)
// It's common to use 'any' if not integrating specific library types like mediasoup-client types directly.
export type DtlsParameters = any;
export type RtpCapabilities = any;
export type RtpParameters = any;
export type SctpCapabilities = any;

export interface WebRtcTransportParams {
  id: string;
  iceParameters: Record<string, unknown>; // mediasoup specific
  iceCandidates: Record<string, unknown>[]; // mediasoup specific
  dtlsParameters: DtlsParameters; // mediasoup specific
  sctpCapabilities?: SctpCapabilities; // mediasoup specific for SCTP
}

export interface ConsumerParams {
  id: string; // Consumer ID
  producerId: string; // Producer ID of the stream being consumed
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters; // RTP parameters for receiving
  appData?: Record<string, unknown>; // Application-specific data
  track: MediaStreamTrack
}

export interface ProducerInfo {
  producerId: string;
  userId: string;
  socketId: string; // Socket ID of the user producing
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters; // For reference, may not be needed by all consumers directly
  appData?: { type?: 'webcam' | 'screen'; [key: string]: any };
  transportId: string; // Transport used for this producer
}
