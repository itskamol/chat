import { Socket } from 'socket.io'; // Make sure Socket is imported from socket.io
import { SocketEvent } from '../enums/socket-event';
import * as P from './payloads'; // P for Payloads
import { Message, User, Room } from '../types'; // Other necessary types from shared

// Events emitted by the Client, listened to by the Server
export interface ClientToServerEvents {
  [SocketEvent.SEND_MESSAGE]: (payload: P.SendMessagePayload) => void;
  [SocketEvent.GET_MESSAGES]: (payload: P.GetMessagesPayload, callback: (response: P.MessagesLoadedPayload | P.MessageErrorPayload) => void) => void;
  [SocketEvent.MARK_MESSAGE_AS_READ]: (payload: P.MarkMessageAsReadPayload, callback?: (response: P.MessageErrorPayload | P.EmptyPayload) => void) => void;
  [SocketEvent.TYPING]: (payload: P.TypingPayload) => void;
  [SocketEvent.GET_ONLINE_USERS]: (callback: (response: P.OnlineUsersListPayload) => void) => void;

  // WebRTC C2S (often with callbacks)
  [SocketEvent.JOIN_ROOM]: (payload: P.JoinRoomPayload, callback: (response: P.JoinRoomResponsePayload) => void) => void;
  [SocketEvent.LEAVE_ROOM]: (payload: P.LeaveRoomPayload, callback: (response: P.LeaveRoomResponsePayload) => void) => void;
  [SocketEvent.GET_ROUTER_RTP_CAPABILITIES]: (payload: P.GetRouterRtpCapabilitiesPayload, callback: (response: P.GetRouterRtpCapabilitiesResponsePayload) => void) => void;
  [SocketEvent.CREATE_WEBRTC_TRANSPORT]: (payload: P.CreateWebRtcTransportPayload, callback: (response: P.CreateWebRtcTransportResponsePayload) => void) => void;
  [SocketEvent.CONNECT_WEBRTC_TRANSPORT]: (payload: P.ConnectWebRtcTransportPayload, callback: (response: P.ConnectWebRtcTransportResponsePayload) => void) => void;
  [SocketEvent.PRODUCE]: (payload: P.ProducePayload, callback: (response: P.ProduceResponsePayload) => void) => void;
  [SocketEvent.CONSUME]: (payload: P.ConsumePayload, callback: (response: P.ConsumeResponsePayload) => void) => void;
  [SocketEvent.START_SCREEN_SHARE]: (payload: P.StartScreenSharePayload, callback: (response: P.StartScreenShareResponsePayload) => void) => void;
  [SocketEvent.STOP_SCREEN_SHARE]: (payload: P.StopScreenSharePayload, callback: (response: P.StopScreenShareResponsePayload) => void) => void;
}

// Events emitted by the Server, listened to by the Client
export interface ServerToClientEvents {
  [SocketEvent.ERROR]: (payload: P.ErrorPayload) => void;
  [SocketEvent.RECEIVE_MESSAGE]: (payload: Message) => void;
  [SocketEvent.MESSAGES_LOADED]: (payload: P.MessagesLoadedPayload) => void;
  [SocketEvent.MESSAGE_ERROR]: (payload: P.MessageErrorPayload) => void;
  [SocketEvent.MESSAGE_SENT]: (payload: P.MessageSentPayload) => void; // Added
  [SocketEvent.USER_TYPING]: (payload: P.UserTypingPayload) => void;
  [SocketEvent.ONLINE_USERS_LIST]: (payload: P.OnlineUsersListPayload) => void;
  [SocketEvent.USER_STATUS_CHANGED]: (payload: P.UserStatusChangedPayload) => void;

  // WebRTC S2C (broadcasts or specific messages)
  [SocketEvent.USER_JOINED]: (payload: P.UserJoinedPayload) => void;
  [SocketEvent.USER_LEFT]: (payload: P.UserLeftPayload) => void;
  [SocketEvent.NEW_PRODUCER]: (payload: P.NewProducerPayload) => void;
  [SocketEvent.PRODUCER_CLOSED]: (payload: P.ProducerClosedPayload) => void;
  [SocketEvent.ACTIVE_PRODUCERS]: (payload: P.ActiveProducersPayload) => void;
}

// Interface for Inter-Server Events
export interface InterServerEvents {
  // Currently empty, add if needed
}

// SocketData interface (data attached to socket instance)
export interface SocketData {
  user?: User; // Or just userId: string;
  roomId?: string;
}

// Define a typed Socket for use in services/controllers
export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
