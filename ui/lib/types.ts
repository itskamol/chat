import { MESSAGE_TYPES, SOCKET_EVENTS } from './constants';

// Import shared types
import type {
    User,
    Message as SharedMessage,
} from '@chat/shared';

// API Types
export interface APIError extends Error {
    status: number;
    message: string;
}

// Extend shared Message type with frontend-specific fields
export interface Message extends SharedMessage {
    senderName?: string;
    uploadProgress?: number;
}

// Socket Types
export type SocketEventType =
    (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];


// WebRTC Types
export interface MediaDeviceInfo {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'videoinput';
}

export interface CallParticipant {
    id: string;
    name: string;
    stream?: MediaStream;
    audioEnabled: boolean;
    videoEnabled: boolean;
}

export interface CallState {
    isInCall: boolean;
    isConnecting: boolean;
    participants: Map<string, CallParticipant>;
    localStream: MediaStream | null;
    error: string | null;
}

// Form Types
export interface LoginForm {
    email: string;
    password: string;
}

export interface RegisterForm extends LoginForm {
    name: string;
    confirmPassword: string;
}

// Component Props Types
export interface ChatProps {
    user: User;
    selectedContact: User | null;
    onSelectContact: (contact: User) => void;
    onLogout: () => void;
}

export interface MessageInputProps {
    onSendMessage: (text: string) => void;
    onSendFile: (file: File, caption?: string) => void;
    onSendAudio: (blob: Blob, caption?: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export interface MessageListProps {
    messages: Message[];
    currentUser: User | null;
    selectedContact: User | null;
    onRetry?: (message: Message) => void;
}

export interface MessageBubbleProps {
    message: Message;
    isCurrentUser: boolean;
    onRetry?: () => void;
}

// API Response Types
export interface ApiResponse<T> {
    status: number;
    message: string;
    data?: T;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// FileUploadResponse is imported from shared types

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];
