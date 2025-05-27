// Define message types for better type safety
export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'text' | 'file' | 'audio';
    createdAt: string;
}

export interface ServerToClientEvents {
    error: (data: { message: string }) => void;
    authenticated: (data: { userId: string; username: string }) => void;
    onlineUsers: (users: Array<{ userId: string; username: string }>) => void;
    userTyping: (data: { userId: string; username: string; isTyping: boolean }) => void;
    messageReceived: (message: Message) => void;
    messageRead: (messageId: string) => void;
    userJoinedRoom: (data: { userId: string; username: string; roomId: string }) => void;
    userLeftRoom: (data: { userId: string; username: string; roomId: string }) => void;
}

export interface ClientToServerEvents {
    getOnlineUsers: () => void;
    typing: (data: { isTyping: boolean; receiverId: string }) => void;
    sendMessage: (data: { receiverId: string; content: string; type: Message['type'] }) => void;
    getMessages: (data: { userId: string }) => void;
    markMessageAsRead: (messageId: string) => void;
    joinRoom: (data: { roomId: string }, callback: (response: any) => void) => void;
    leaveRoom: (data: { roomId: string }, callback: (response: any) => void) => void;
    // WebRTC events
    getRouterRtpCapabilities: (data: { roomId: string }, callback: (response: any) => void) => void;
    createWebRtcTransport: (data: any, callback: (response: any) => void) => void;
    connectWebRtcTransport: (data: any, callback: (response: any) => void) => void;
    produce: (data: any, callback: (response: any) => void) => void;
    consume: (data: any, callback: (response: any) => void) => void;
    startScreenShare: (data: any, callback: (response: any) => void) => void;
    stopScreenShare: (data: any, callback: (response: any) => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId?: string;
    username?: string;
}
