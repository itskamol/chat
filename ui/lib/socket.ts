import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(URL, {
      transports: ['websocket', 'polling'],
      // reconnectionAttempts: 5, // You can configure reconnection attempts
      // reconnectionDelay: 1000, // Delay between reconnection attempts
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Handle disconnection, e.g., show a message to the user
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Handle connection errors
    });
  }
  return socket;
};

// Optional: Function to explicitly disconnect the socket
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
    console.log('Socket explicitly disconnected');
  }
};

// --- Event Emitters ---

/**
 * Emits 'userOnline' event when a user logs in.
 * @param userId - The ID of the user who is now online.
 */
export const emitUserOnline = (userId: string) => {
  const currentSocket = getSocket();
  if (currentSocket && userId) {
    currentSocket.emit('userOnline', userId);
  }
};

/**
 * Emits 'sendMessage' event to send a message.
 * @param messageData - Object containing senderId, receiverId, and message content.
 */
export const emitSendMessage = (messageData: { senderId: string; receiverId: string; message: string }) => {
  const currentSocket = getSocket();
  if (currentSocket && messageData) {
    currentSocket.emit('sendMessage', messageData);
  }
};

/**
 * Emits 'getOnlineUsers' event to request the list of online users.
 */
export const emitGetOnlineUsers = () => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.emit('getOnlineUsers');
  }
};

/**
 * Emits 'typing' event to indicate user typing status.
 * @param typingData - Object containing senderId, receiverId, and isTyping boolean.
 */
export const emitTyping = (typingData: { senderId: string; receiverId: string; isTyping: boolean }) => {
  const currentSocket = getSocket();
  if (currentSocket && typingData) {
    currentSocket.emit('typing', typingData);
  }
};


// --- WebRTC Signaling Event Emitters ---

export const emitJoinRoom = (roomId: string, callback: (data: { error?: string, activeProducers?: any[] }) => void) => {
  const currentSocket = getSocket();
  currentSocket.emit('joinRoom', { roomId }, callback);
};

export const emitLeaveRoom = (roomId: string, callback?: (data: { error?: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.emit('leaveRoom', { roomId }, callback);
};

export const emitGetRouterRtpCapabilities = (roomId: string, callback: (data: any | { error: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.emit('getRouterRtpCapabilities', { roomId }, callback);
};

export const emitCreateWebRtcTransport = (
  payload: { roomId: string; producing: boolean; consuming: boolean; sctpCapabilities?: any },
  callback: (data: any | { error: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('createWebRtcTransport', payload, callback);
};

export const emitConnectWebRtcTransport = (
  payload: { roomId: string; transportId: string; dtlsParameters: any },
  callback: (data: { error?: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('connectWebRtcTransport', payload, callback);
};

export const emitProduce = (
  payload: { roomId: string; transportId: string; kind: 'audio' | 'video'; rtpParameters: any; appData?: any },
  callback: (data: { producerId?: string; error?: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('produce', payload, callback);
};

export const emitConsume = (
  payload: { roomId: string; transportId: string; producerId: string; rtpCapabilities: any },
  callback: (data: any | { error: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('consume', payload, callback);
};

export const emitStartScreenShare = (
  payload: { roomId: string; transportId: string; kind: 'video'; rtpParameters: any; appData: { type: 'screen', [key: string]: any } },
  callback: (data: { producerId?: string; error?: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('startScreenShare', payload, callback);
};

export const emitStopScreenShare = (
  payload: { roomId: string; producerId: string },
  callback: (data: { error?: string }) => void
) => {
  const currentSocket = getSocket();
  currentSocket.emit('stopScreenShare', payload, callback);
};


// --- Event Listeners (example structure, implement in your components) ---

/**
 * Listens for 'onlineUsersList' event.
 * @param callback - Function to handle the list of online users.
 * @returns A function to remove the event listener.
 */
export const onOnlineUsersList = (callback: (users: Array<{ userId: string; status: string; lastSeen: Date }>) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('onlineUsersList', callback);
  return () => currentSocket.off('onlineUsersList', callback);
};

/**
 * Listens for 'userStatusChanged' event.
 * @param callback - Function to handle user status changes.
 * @returns A function to remove the event listener.
 */
export const onUserStatusChanged = (callback: (data: { userId: string; status: string; lastSeen: Date }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('userStatusChanged', callback);
  return () => currentSocket.off('userStatusChanged', callback);
};

/**
 * Listens for 'receiveMessage' event.
 * @param callback - Function to handle incoming messages.
 * @returns A function to remove the event listener.
 */
export const onReceiveMessage = (callback: (message: { _id: string; senderId: string; receiverId: string; message: string; createdAt: Date }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('receiveMessage', callback);
  return () => currentSocket.off('receiveMessage', callback);
};

/**
 * Listens for 'messageSent' event (confirmation from server).
 * @param callback - Function to handle message sent confirmation.
 * @returns A function to remove the event listener.
 */
export const onMessageSent = (callback: (confirmation: { _id: string; senderId: string; receiverId: string; message: string; createdAt: Date; delivered: boolean }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('messageSent', callback);
  return () => currentSocket.off('messageSent', callback);
};

/**
 * Listens for 'messageError' event.
 * @param callback - Function to handle message sending errors.
 * @returns A function to remove the event listener.
 */
export const onMessageError = (callback: (error: { error: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('messageError', callback);
  return () => currentSocket.off('messageError', callback);
};

/**
 * Listens for 'userTyping' event.
 * @param callback - Function to handle user typing status.
 * @returns A function to remove the event listener.
 */
export const onUserTyping = (callback: (data: { senderId: string; isTyping: boolean }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('userTyping', callback);
  return () => currentSocket.off('userTyping', callback);
};

// --- WebRTC Signaling Event Listeners ---

export const onUserJoinedRoom = (callback: (payload: { userId: string; socketId: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('userJoined', callback);
  return () => currentSocket.off('userJoined', callback);
};

export const onUserLeftRoom = (callback: (payload: { userId: string; socketId: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('userLeft', callback);
  return () => currentSocket.off('userLeft', callback);
};

export const onNewProducer = (callback: (payload: { producerId: string; userId: string; kind: 'audio' | 'video'; appData?: any, socketId: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('newProducer', callback);
  return () => currentSocket.off('newProducer', callback);
};

export const onProducerClosed = (callback: (payload: { producerId: string; userId: string, socketId: string }) => void) => {
  const currentSocket = getSocket();
  currentSocket.on('producerClosed', callback);
  return () => currentSocket.off('producerClosed', callback);
};

export const onActiveProducers = (callback: (payload: { producerId: string, kind: 'audio' | 'video', userId: string, appData?: any }[]) => void) => {
  const currentSocket = getSocket();
  // This event is emitted by server in response to 'joinRoom' or when a user is already in a room and new producers are announced.
  // It's not strictly a "listener" in the same way as others, but a way to handle this specific data push.
  // The actual 'joinRoom' callback handles the initial list. This could be for dynamic updates if needed,
  // or could be removed if 'newProducer' and 'producerClosed' are sufficient after initial join.
  // For now, let's assume it's primarily for the initial join list, handled by joinRoom's callback.
  // If it's intended as a separate, ad-hoc event from the server, then this listener is fine.
  currentSocket.on('activeProducers', callback);
  return () => currentSocket.off('activeProducers', callback);
};


// Placeholder for transportProduceDone and transportConsumeDone if specific client-side handling is needed
// Often, the success/failure of produce/consume is handled via the callback of emitProduce/emitConsume.
// These server-to-client events might be useful for more complex scenarios or specific notifications.

export const onTransportProduceDone = (callback: (payload: { transportId: string; producerId: string }) => void) => {
    const currentSocket = getSocket();
    currentSocket.on('transportProduceDone', callback);
    return () => currentSocket.off('transportProduceDone', callback);
};

export const onTransportConsumeDone = (callback: (payload: { transportId: string; consumerId: string; producerId: string; kind: 'audio' | 'video'; rtpParameters: any; appData?: any }) => void) => {
    const currentSocket = getSocket();
    currentSocket.on('transportConsumeDone', callback);
    return () => currentSocket.off('transportConsumeDone', callback);
};
