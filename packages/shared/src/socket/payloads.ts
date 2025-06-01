import { Message, User, Room, FileUploadResponse, RtpCapabilities, WebRtcTransportParams, DtlsParameters, RtpParameters, SctpCapabilities, ProducerInfo, ConsumerParams } from '../types';
import { MessageType, MessageStatus } from '../enums';

// Basic Payloads
export interface ErrorPayload {
  message: string;
  code?: string | number; // Optional error code
}
export interface EmptyPayload {}

// Messaging Payloads
export interface SendMessagePayload {
  receiverId: string;
  content: string;
  type: MessageType;
  tempId?: string; // Optional: for client-side message tracking before confirmation
}
// For RECEIVE_MESSAGE, the payload is typically the full Message object.
// export type ReceiveMessagePayload = Message; // This will be used directly in event definitions

export interface GetMessagesPayload {
  receiverId: string;
  page?: number;
  limit?: number;
}
export interface MessagesLoadedPayload {
  messages: Message[];
  receiverId: string; // Context for which chat these messages belong to
}
export interface MarkMessageAsReadPayload {
  messageId: string;
  chatId?: string; // or receiverId, to specify context
}
export interface MessageErrorPayload {
  error: string;
  tempId?: string;   // To identify which message failed on client
  messageId?: string; // To identify which existing message had an issue
}

export interface MessageSentPayload extends Message { // Extends the base Message
  delivered: boolean; // Indicates if the message was delivered to an online recipient
  tempId?: string;     // The temporary client-side ID, if provided with SendMessagePayload
}

// Presence/Typing Payloads
export interface TypingPayload {
  receiverId: string; // User being typed to
  isTyping: boolean;
}
export interface UserTypingPayload {
  senderId: string;
  // receiverId: string; // Could be useful if event is broadcast to a room but intended for one.
  isTyping: boolean;
}

export interface OnlineUser {
  userId: string;
  name?: string;
  avatarUrl?: string;
  status: 'online'; // Explicitly online
  lastSeen?: Date; // Should be recent for online users
}
export interface OnlineUsersListPayload {
  users: OnlineUser[];
}
export interface UserStatusChangedPayload {
  userId: string;
  name?: string;
  avatarUrl?: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

// WebRTC Payloads

// For events with callbacks, we can define Request and Response/Callback types
// Example: FooRequestPayload, FooResponsePayload (or FooCallbackPayload)

export interface JoinRoomPayload { // C2S
  roomId: string;
}
export interface JoinRoomResponsePayload { // S2C callback
  error?: string;
  activeProducers?: ProducerInfo[];
  // Other room state info if necessary
}

export interface UserJoinedPayload { // S2C broadcast
  roomId: string;
  userId: string;
  name?: string;
  avatarUrl?: string;
  socketId?: string; // Useful for direct client-client (though not recommended for signaling)
  // any other info about the user that room members should know
}

export interface LeaveRoomPayload { // C2S
  roomId: string;
}
export interface LeaveRoomResponsePayload { // S2C callback
  error?: string;
}

export interface UserLeftPayload { // S2C broadcast
  roomId: string;
  userId: string;
  socketId?: string; // To identify which connection of the user left
}

export interface GetRouterRtpCapabilitiesPayload { // C2S
  roomId: string;
}
export interface GetRouterRtpCapabilitiesResponsePayload { // S2C callback
  rtpCapabilities?: RtpCapabilities;
  error?: string;
}

export interface CreateWebRtcTransportPayload { // C2S
  roomId: string;
  producing: boolean;
  consuming: boolean;
  sctpCapabilities?: SctpCapabilities; // From mediasoup-client device.sctpCapabilities
}
export interface CreateWebRtcTransportResponsePayload { // S2C callback
  transportOptions?: WebRtcTransportParams; // Server sends params to client
  error?: string;
}

export interface ConnectWebRtcTransportPayload { // C2S
  roomId: string;
  transportId: string;
  dtlsParameters: DtlsParameters; // From mediasoup-client transport.on('connect')
}
export interface ConnectWebRtcTransportResponsePayload { // S2C callback
  error?: string; // Empty on success
}

export interface ProducePayload { // C2S
  roomId: string;
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters; // From mediasoup-client producer.rtpParameters
  appData?: Record<string, any>; // Custom app data associated with producer
}
export interface ProduceResponsePayload { // S2C callback
  producerId?: string; // ID of the new producer on the server
  error?: string;
}

export interface NewProducerPayload { // S2C broadcast
  roomId: string; // Context: which room this producer belongs to
  producerId: string;
  userId: string; // User who created this producer
  name?: string; // Optional: name of the user
  avatarUrl?: string; // Optional: avatar of the user
  kind: 'audio' | 'video';
  appData?: Record<string, any>;
  socketId: string; // Socket that originated this producer
}

export interface ConsumePayload { // C2S
  roomId: string;
  transportId: string; // Consumer's transportId
  producerId: string;  // Producer to consume
  rtpCapabilities: RtpCapabilities; // From mediasoup-client device.rtpCapabilities
}
export interface ConsumeResponsePayload { // S2C callback
  consumerOptions?: ConsumerParams; // Parameters to create consumer on client
  error?: string;
}

export interface ProducerClosedPayload { // S2C broadcast
  roomId: string;
  producerId: string;
  userId?: string; // User whose producer closed (if known)
  socketId?: string; // Socket whose producer closed
}

export interface StartScreenSharePayload { // C2S
  roomId: string;
  transportId: string;
  // kind is implicitly 'video' for screen share
  rtpParameters: RtpParameters;
  appData?: { type: 'screen', [key: string]: any };
}
export interface StartScreenShareResponsePayload { // S2C callback
  producerId?: string;
  error?: string;
}

export interface StopScreenSharePayload { // C2S
  roomId: string;
  producerId: string; // The producerId of the screen share track
}
export interface StopScreenShareResponsePayload { // S2C callback
  error?: string;
}

export interface ActiveProducersPayload { // S2C event
  roomId: string;
  producers: ProducerInfo[];
}
