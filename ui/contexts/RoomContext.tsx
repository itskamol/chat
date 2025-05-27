import React, { createContext, useContext, useState, useCallback } from 'react';
import { Participant } from './VideoCallContext';

interface RoomContextState {
  roomId: string | null;
  participants: Map<string, Participant>;
  localUserId: string | null;
  activeSpeakerId: string | null;
}

interface RoomContextActions {
  setRoomId: (roomId: string | null) => void;
  setLocalUserId: (userId: string | null) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setActiveSpeaker: (participantId: string | null) => void;
}

interface RoomContextValue extends RoomContextState, RoomContextActions {}

const RoomContext = createContext<RoomContextValue | null>(null);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RoomContextState>({
    roomId: null,
    participants: new Map(),
    localUserId: null,
    activeSpeakerId: null
  });

  const setRoomId = useCallback((roomId: string | null) => {
    setState(prev => ({ ...prev, roomId }));
  }, []);

  const setLocalUserId = useCallback((localUserId: string | null) => {
    setState(prev => ({ ...prev, localUserId }));
  }, []);

  const addParticipant = useCallback((participant: Participant) => {
    setState(prev => ({
      ...prev,
      participants: new Map(prev.participants).set(participant.id, participant)
    }));
  }, []);

  const removeParticipant = useCallback((participantId: string) => {
    setState(prev => {
      const newParticipants = new Map(prev.participants);
      newParticipants.delete(participantId);
      return { ...prev, participants: newParticipants };
    });
  }, []);

  const updateParticipant = useCallback((participantId: string, updates: Partial<Participant>) => {
    setState(prev => {
      const participant = prev.participants.get(participantId);
      if (!participant) return prev;

      const updatedParticipant = { ...participant, ...updates };
      return {
        ...prev,
        participants: new Map(prev.participants).set(participantId, updatedParticipant)
      };
    });
  }, []);

  const setActiveSpeaker = useCallback((participantId: string | null) => {
    setState(prev => ({ ...prev, activeSpeakerId: participantId }));
  }, []);

  return (
    <RoomContext.Provider
      value={{
        ...state,
        setRoomId,
        setLocalUserId,
        addParticipant,
        removeParticipant,
        updateParticipant,
        setActiveSpeaker
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};
