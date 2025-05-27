import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MediaDeviceInfo } from '@/lib/types';

interface MediaContextState {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  isScreenSharing: boolean;
}

interface MediaContextActions {
  startLocalMedia: (audio?: boolean, video?: boolean) => Promise<MediaStream | null>;
  stopLocalMedia: () => void;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => Promise<void>;
  toggleLocalAudio: () => Promise<void>;
  toggleLocalVideo: () => Promise<void>;
}

interface MediaContextValue extends MediaContextState, MediaContextActions {}

const MediaContext = createContext<MediaContextValue | null>(null);

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MediaContextState>({
    localStream: null,
    localScreenStream: null,
    localAudioEnabled: false,
    localVideoEnabled: false,
    isScreenSharing: false
  });

  const startLocalMedia = useCallback(async (audio = true, video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      setState(prev => ({
        ...prev,
        localStream: stream,
        localAudioEnabled: audio,
        localVideoEnabled: video
      }));
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    state.localStream?.getTracks().forEach(track => track.stop());
    setState(prev => ({
      ...prev,
      localStream: null,
      localAudioEnabled: false,
      localVideoEnabled: false
    }));
  }, [state.localStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      setState(prev => ({
        ...prev,
        localScreenStream: stream,
        isScreenSharing: true
      }));

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    state.localScreenStream?.getTracks().forEach(track => track.stop());
    setState(prev => ({
      ...prev,
      localScreenStream: null,
      isScreenSharing: false
    }));
  }, [state.localScreenStream]);

  const toggleLocalAudio = useCallback(async () => {
    if (!state.localStream) return;
    const audioTrack = state.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({
        ...prev,
        localAudioEnabled: audioTrack.enabled
      }));
    }
  }, [state.localStream]);

  const toggleLocalVideo = useCallback(async () => {
    if (!state.localStream) return;
    const videoTrack = state.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setState(prev => ({
        ...prev,
        localVideoEnabled: videoTrack.enabled
      }));
    }
  }, [state.localStream]);

  return (
    <MediaContext.Provider
      value={{
        ...state,
        startLocalMedia,
        stopLocalMedia,
        startScreenShare,
        stopScreenShare,
        toggleLocalAudio,
        toggleLocalVideo
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};
