// File upload
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mpeg',
  'audio/webm',
  'application/pdf',
  'text/plain'
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// WebRTC config
export const WEBRTC_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

// Socket events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING: 'typing',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  CALL_REQUEST: 'callRequest',
  CALL_ACCEPTED: 'callAccepted',
  CALL_REJECTED: 'callRejected',
  CALL_ENDED: 'callEnded',
} as const;

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
} as const;

// Message status
export const MESSAGE_STATUS = {
  NOT_DELIVERED: 'NotDelivered',
  DELIVERED: 'Delivered',
  SEEN: 'Seen',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    CONTACTS: '/users/contacts',
    PROFILE: '/users/profile',
  },
  MESSAGES: {
    SEND: '/messages/send',
    GET: '/messages/get',
    UPLOAD: '/messages/upload',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized. Please log in again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 50MB.',
  UNSUPPORTED_FILE_TYPE: 'File type not supported.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  MEDIA_PERMISSION_DENIED: 'Please allow access to your camera and microphone.',
} as const;
