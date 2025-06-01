export enum SocketEvent {
  // General/Error
  ERROR = 'error', // Consistent name for client and server

  // Messaging
  SEND_MESSAGE = 'sendMessage',
  RECEIVE_MESSAGE = 'receiveMessage', // Standardized from messageReceived (UI) and receiveMessage (server)
  GET_MESSAGES = 'getMessages',
  MESSAGES_LOADED = 'messagesLoaded',
  MARK_MESSAGE_AS_READ = 'markMessageAsRead',
  MESSAGE_ERROR = 'messageError',
  MESSAGE_SENT = 'messageSent', // Added for sender confirmation

  // Presence/Typing
  TYPING = 'typing',
  USER_TYPING = 'userTyping',
  GET_ONLINE_USERS = 'getOnlineUsers',
  ONLINE_USERS_LIST = 'onlineUsersList', // Standardized from onlineUsers
  USER_STATUS_CHANGED = 'userStatusChanged',
  USER_ONLINE = "userOnline",
  // WebRTC Room Management & Signaling
  JOIN_ROOM = 'joinRoom',
  USER_JOINED = 'userJoined',
  LEAVE_ROOM = 'leaveRoom',
  USER_LEFT = 'userLeft',
  GET_ROUTER_RTP_CAPABILITIES = 'getRouterRtpCapabilities',
  CREATE_WEBRTC_TRANSPORT = 'createWebRtcTransport',
  CONNECT_WEBRTC_TRANSPORT = 'connectWebRtcTransport',
  PRODUCE = 'produce',
  NEW_PRODUCER = 'newProducer',
  CONSUME = 'consume',
  PRODUCER_CLOSED = 'producerClosed',
  START_SCREEN_SHARE = 'startScreenShare',
  STOP_SCREEN_SHARE = 'stopScreenShare',
  ACTIVE_PRODUCERS = 'activeProducers', // Event for initial producer list

  // Standard Socket.IO events (optional to include if not directly handled by custom types)
  // CONNECT = 'connect',
  // DISCONNECT = 'disconnect',
  // CONNECT_ERROR = 'connect_error',
}
