import { io, Socket } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost/ws';

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
