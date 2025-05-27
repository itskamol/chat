import React from 'react';
import { MediaProvider, useMedia } from './MediaContext';
import { RoomProvider, useRoom } from './RoomContext';
import { useWebRTC, WebRTCProvider } from './WebRTCContext';

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MediaProvider>
      <RoomProvider>
        <WebRTCProvider>
          {children}
        </WebRTCProvider>
      </RoomProvider>
    </MediaProvider>
  );
};

// Re-export hooks for convenience
export { useMedia } from './MediaContext';
export { useRoom } from './RoomContext';
export { useWebRTC } from './WebRTCContext';

// Combined hook for backward compatibility
export const useVideoCall = () => {
  const media = useMedia();
  const room = useRoom();
  const webrtc = useWebRTC();

  return {
    // Room state
    roomId: room.roomId,
    participants: room.participants,
    localUserId: room.localUserId,
    activeSpeakerId: room.activeSpeakerId,
    
    // Media state
    localStream: media.localStream,
    localScreenStream: media.localScreenStream,
    localAudioEnabled: media.localAudioEnabled,
    localVideoEnabled: media.localVideoEnabled,
    isScreenSharing: media.isScreenSharing,
    
    // WebRTC state
    isInCall: webrtc.isInCall,
    isConnecting: webrtc.isConnecting,
    error: webrtc.error,
    remoteConsumers: webrtc.remoteConsumers,
    screenShareProducerId: webrtc.screenShareProducerId,

    // Room actions
    setRoomId: room.setRoomId,
    setLocalUserId: room.setLocalUserId,
    addParticipant: room.addParticipant,
    removeParticipant: room.removeParticipant,
    updateParticipant: room.updateParticipant,
    setActiveSpeaker: room.setActiveSpeaker,

    // Media actions
    startLocalMedia: media.startLocalMedia,
    stopLocalMedia: media.stopLocalMedia,
    startScreenShare: media.startScreenShare,
    stopScreenShare: media.stopScreenShare,
    toggleLocalAudio: media.toggleLocalAudio,
    toggleLocalVideo: media.toggleLocalVideo,

    // WebRTC actions
    initiateCall: webrtc.initiateCall,
    leaveCall: webrtc.leaveCall,
    handleNewProducer: webrtc.handleNewProducer,
  };
};
