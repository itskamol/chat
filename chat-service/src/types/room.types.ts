import { Socket } from 'socket.io';
import { ProducerInfo, RoomState as BaseRoomState } from './signaling.types';

export interface RoomParticipant {
    socketId: string;
    userId: string;
    producers: Map<string, ProducerInfo>;
}

export interface RoomState extends BaseRoomState {
    participants: Map<string, RoomParticipant>; // socketId -> RoomParticipant
}

export interface RoomJoinRequest {
    roomId: string;
}

export interface RoomJoinResponse {
    error?: string;
    activeProducers?: Array<{
        producerId: string;
        kind: 'audio' | 'video';
        userId: string;
        appData?: Record<string, unknown>;
    }>;
}

export interface RoomLeaveRequest {
    roomId: string;
}

export interface RoomLeaveResponse {
    error?: string;
}
