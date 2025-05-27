import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCClient, ConsumerInfo } from '@/lib/webrtcClient';
import {
  emitJoinRoom,
  emitLeaveRoom,
  onNewProducer,
  onProducerClosed,
  onUserJoined,
  onUserLeft,
  onActiveProducers
} from '@/lib/socket';
import { useRoom } from './RoomContext';
import { useMedia } from './MediaContext';

interface WebRTCContextState {
  isInCall: boolean;
  isConnecting: boolean;
  error: string | null;
  remoteConsumers: Map<string, ConsumerInfo>;
  screenShareProducerId: string | null;
}

interface WebRTCContextActions {
  initiateCall: (roomId: string, userId: string, userName?: string) => Promise<void>;
  leaveCall: () => Promise<void>;
  handleNewProducer: (payload: {
    producerId: string;
    userId: string;
    kind: 'audio' | 'video';
    appData?: { type?: 'webcam' | 'screen' };
    socketId: string;
  }) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

interface WebRTCContextValue extends WebRTCContextState, WebRTCContextActions {}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WebRTCContextState>({
    isInCall: false,
    isConnecting: false,
    error: null,
    remoteConsumers: new Map(),
    screenShareProducerId: null
  });

  const webrtcClientRef = useRef<WebRTCClient | null>(null);
  const { 
    roomId, 
    localUserId, 
    setRoomId, 
    setLocalUserId,
    addParticipant,
    removeParticipant,
    updateParticipant 
  } = useRoom();
  
  const {
    localStream,
    localAudioEnabled,
    localVideoEnabled,
    localScreenStream,
    isScreenSharing,
    startLocalMedia,
    stopLocalMedia
  } = useMedia();

  useEffect(() => {
    if (!webrtcClientRef.current) {
      webrtcClientRef.current = new WebRTCClient();
    }
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const handleNewProducer = useCallback(async (payload: {
    producerId: string;
    userId: string;
    kind: 'audio' | 'video';
    appData?: { type?: 'webcam' | 'screen' };
    socketId: string;
  }) => {
    if (!webrtcClientRef.current?.isInitialized() || !state.isInCall) {
      console.warn('Received newProducer but WebRTC client not ready or not in call.');
      return;
    }

    const { producerId, userId, kind, appData, socketId } = payload;
    const producerType = appData?.type || 'webcam';

    try {
      const rtpCapabilities = webrtcClientRef.current.getDeviceRtpCapabilities();
      if (!rtpCapabilities) {
        throw new Error('Device RTP capabilities not available');
      }

      const consumerInfo = await webrtcClientRef.current.consume(
        producerId,
        kind,
        rtpCapabilities,
        appData
      );

      if (consumerInfo) {
        setState(prev => ({
          ...prev,
          remoteConsumers: new Map(prev.remoteConsumers).set(producerId, consumerInfo)
        }));

        // Update participant's stream with the new track
        if (producerType === 'screen') {
          updateParticipant(userId, {
            screenStream: new MediaStream([consumerInfo.track]),
            isScreenSharing: true
          });
        } else {
          const streamUpdate = updateParticipantStream(userId, consumerInfo);
          updateParticipant(userId, streamUpdate);
        }
      }
    } catch (error) {
      console.error('Error consuming producer:', error);
      setError(`Failed to consume media: ${(error as Error).message}`);
    }
  }, [state.isInCall, updateParticipant, setError]);

  const updateParticipantStream = useCallback((
    userId: string,
    consumerInfo: ConsumerInfo
  ) => {
    const currentStream = new MediaStream();
    const oldTrack = currentStream.getTracks().find((t: MediaStreamTrack) => t.kind === consumerInfo.track.kind);
    
    if (oldTrack) {
      currentStream.removeTrack(oldTrack);
    }
    currentStream.addTrack(consumerInfo.track);

    return {
      stream: currentStream,
      audioEnabled: currentStream.getAudioTracks().some((t: MediaStreamTrack) => t.enabled),
      videoEnabled: currentStream.getVideoTracks().some((t: MediaStreamTrack) => t.enabled)
    };
  }, []);

  const initiateCall = useCallback(async (
    callRoomId: string,
    userId: string,
    userName?: string
  ) => {
    if (state.isInCall || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    setRoomId(callRoomId);
    setLocalUserId(userId);

    try {
      const stream = await startLocalMedia(localAudioEnabled, localVideoEnabled);
      if (!stream) throw new Error('Failed to get local media stream');

      addParticipant({
        id: userId,
        name: userName || userId,
        stream,
        audioEnabled: localAudioEnabled,
        videoEnabled: localVideoEnabled,
        isScreenSharing: false
      });

      emitJoinRoom(callRoomId, async (joinResponse) => {
        if (joinResponse.error) {
          throw new Error(joinResponse.error);
        }

        try {
          await webrtcClientRef.current?.loadDevice(callRoomId);
          await webrtcClientRef.current?.createSendTransport();
          await webrtcClientRef.current?.createRecvTransport();

          // Start producing local tracks
          if (localAudioEnabled) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              const audioProducer = await webrtcClientRef.current?.produce(audioTrack, {
                userId,
                type: 'webcam'
              });
              if (audioProducer) {
                updateParticipant(userId, { audioProducerId: audioProducer.id });
              }
            }
          }

          if (localVideoEnabled) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              const videoProducer = await webrtcClientRef.current?.produce(videoTrack, {
                userId,
                type: 'webcam'
              });
              if (videoProducer) {
                updateParticipant(userId, { videoProducerId: videoProducer.id });
              }
            }
          }

          setState(prev => ({ ...prev, isInCall: true, isConnecting: false }));

          if (joinResponse.activeProducers) {
            joinResponse.activeProducers.forEach((producer: any) => {
              if (producer.userId !== userId) {
                handleNewProducer({ ...producer, socketId: '' });
              }
            });
          }
        } catch (error) {
          throw new Error(`WebRTC setup failed: ${(error as Error).message}`);
        }
      });
    } catch (error) {
      console.error('Call initiation failed:', error);
      setError((error as Error).message);
      cleanup();
    }
  }, [
    state.isInCall,
    state.isConnecting,
    setRoomId,
    setLocalUserId,
    addParticipant,
    updateParticipant,
    startLocalMedia,
    localAudioEnabled,
    localVideoEnabled,
    handleNewProducer,
    setError
  ]);

  const cleanup = useCallback(() => {
    stopLocalMedia();
    if (isScreenSharing && localScreenStream) {
      localScreenStream.getTracks().forEach(track => track.stop());
    }
    webrtcClientRef.current?.close();
    setState(prev => ({
      ...prev,
      isInCall: false,
      isConnecting: false,
      error: null,
      remoteConsumers: new Map(),
      screenShareProducerId: null
    }));
    setRoomId(null);
    setLocalUserId(null);
  }, [stopLocalMedia, isScreenSharing, localScreenStream, setRoomId, setLocalUserId]);

  const leaveCall = useCallback(async () => {
    if (!roomId) return;
    
    emitLeaveRoom(roomId);
    cleanup();
  }, [roomId, cleanup]);

  const startScreenShare = useCallback(async () => {
    if (!state.isInCall || isScreenSharing || !localUserId) return;

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Handle user stopping screen share from browser UI
        videoTrack.onended = () => {
          console.log('Screen share track ended by user (browser UI)');
          // This will be handled by the stopScreenShare function
        };

        // Produce the screen share track
        const producerId = await webrtcClientRef.current?.produceScreenShare({
          track: videoTrack,
          appData: {
            userId: localUserId,
            type: 'screen'
          }
        });

        if (producerId) {
          // Update local participant's stream
          updateParticipant(localUserId, {
            screenStream: stream,
            isScreenSharing: true
          });

          setState(prev => ({
            ...prev,
            screenShareProducerId: producerId
          }));
        }
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      setError(`Failed to start screen share: ${(error as Error).message}`);
    }
  }, [state.isInCall, isScreenSharing, localUserId, updateParticipant, setError]);

  const stopScreenShare = useCallback(async () => {
    if (!state.isInCall || !isScreenSharing || !localUserId || !state.screenShareProducerId) return;

    setError(null);

    try {
      // Stop the screen share tracks
      if (localScreenStream) {
        localScreenStream.getTracks().forEach(track => track.stop());
      }

      // Close the screen share producer on the server
      if (roomId) {
        await webrtcClientRef.current?.closeScreenShareProducer(
          state.screenShareProducerId,
          roomId
        );
      }

      // Update local participant's stream
      updateParticipant(localUserId, {
        screenStream: undefined,
        isScreenSharing: false
      });

      setState(prev => ({
        ...prev,
        screenShareProducerId: null
      }));
    } catch (error) {
      console.error('Error stopping screen share:', error);
      setError(`Failed to stop screen share: ${(error as Error).message}`);
    }
  }, [state.isInCall, isScreenSharing, localUserId, state.screenShareProducerId, localScreenStream, roomId, updateParticipant, setError]);

  useEffect(() => {
    if (state.isInCall || state.isConnecting) {
      const cleanupFunctions = [
        onNewProducer(handleNewProducer),
        onProducerClosed((payload) => {
          const { producerId, userId } = payload;
          
          // Remove the consumer from our map
          setState(prev => {
            const newConsumers = new Map(prev.remoteConsumers);
            const consumerInfo = newConsumers.get(producerId);
            
            if (consumerInfo) {
              // Close the consumer using WebRTCClient
              webrtcClientRef.current?.closeConsumer(consumerInfo.id);
              newConsumers.delete(producerId);
              
              // Update participant to remove the track
              if (consumerInfo.track.kind === 'video') {
                // Check if this was a screen share
                if (prev.screenShareProducerId === producerId) {
                  updateParticipant(userId, { 
                    screenStream: undefined,
                    isScreenSharing: false 
                  });
                  return {
                    ...prev,
                    remoteConsumers: newConsumers,
                    screenShareProducerId: null
                  };
                } else {
                  // Regular video track
                  updateParticipant(userId, { videoEnabled: false });
                }
              } else if (consumerInfo.track.kind === 'audio') {
                updateParticipant(userId, { audioEnabled: false });
              }
            }
            
            return {
              ...prev,
              remoteConsumers: newConsumers
            };
          });
        }),
        onUserJoined((payload) => {
          const { userId, socketId, name } = payload;
          
          // Add the new participant if they're not already in the room
          if (userId !== localUserId) {
            addParticipant({
              id: userId,
              name: name || userId,
              stream: new MediaStream(),
              audioEnabled: false,
              videoEnabled: false,
              isScreenSharing: false,
              socketId
            });
          }
        }),
        onUserLeft((payload) => {
          const { userId } = payload;
          if (userId !== localUserId) {
            // Clean up any consumers for this user
            setState(prev => {
              const newConsumers = new Map(prev.remoteConsumers);
              let updatedScreenShareProducerId = prev.screenShareProducerId;
              
              // Find and close all consumers for this user
              for (const [producerId, consumerInfo] of newConsumers.entries()) {
                // Note: We'd need to track which producer belongs to which user
                // This is a limitation of the current design - we should track userId with each consumer
                // For now, we'll remove the participant and let the producerClosed events handle consumer cleanup
              }
              
              return prev;
            });
            
            removeParticipant(userId);
          }
        }),
        onActiveProducers((producers) => {
          producers.forEach(producer => {
            if (producer.userId !== localUserId) {
              handleNewProducer({ ...producer, socketId: '' });
            }
          });
        })
      ];

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  }, [
    state.isInCall,
    state.isConnecting,
    localUserId,
    handleNewProducer,
    removeParticipant,
    addParticipant,
    updateParticipant
  ]);

  return (
    <WebRTCContext.Provider
      value={{
        ...state,
        initiateCall,
        leaveCall,
        handleNewProducer,
        startScreenShare,
        stopScreenShare
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
