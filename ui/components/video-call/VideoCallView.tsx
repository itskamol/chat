import React, { useEffect, useState } from 'react';
import { useVideoCall, Participant } from '@/contexts/VideoCallContext'; // Adjust path as needed
import ParticipantTile from './partials/ParticipantTile';
import VideoControls from './partials/VideoControls';
import ConnectionStatusOverlay from './partials/ConnectionStatusOverlay'; // Create this component later

const VideoCallView: React.FC = () => {
  const {
    isInCall,
    isConnecting,
    error,
    localStream,
    participants, // Using the participants map which includes localUser
    leaveCall,
    initiateCall, // Or joinCall, depending on your entry flow
    _mockAddParticipant, // For UI testing
    _mockRemoveParticipant,
    _mockToggleParticipantAudio,
    _mockToggleParticipantVideo,
  } = useVideoCall();

  const [showMockUI, setShowMockUI] = useState(false); // For easy testing

  // Example: Initialize call or join a mock room for testing
  useEffect(() => {
    if (!isInCall && !isConnecting) {
      // For testing, you might want to automatically initiate a call to a test room.
      // initiateCall('test-room-123'); 
      // Or, for UI development, immediately show mock participants
      // This part will be driven by actual user actions in a real scenario.
    }
  }, [isInCall, isConnecting, initiateCall]);

  // Mock participants for UI development
  useEffect(() => {
    if (showMockUI && participants.size <=1 ) { // only add if no other remote participants
      _mockAddParticipant({ id: 'mockUser1', name: 'Alice (Mock)', audioEnabled: true, videoEnabled: false });
      _mockAddParticipant({ id: 'mockUser2', name: 'Bob (Mock)', audioEnabled: false, videoEnabled: true });
      _mockAddParticipant({ id: 'mockUser3', name: 'Charlie (Mock)', audioEnabled: true, videoEnabled: true });
    }
    if (!showMockUI && participants.size > 1 && Array.from(participants.keys()).some(k => k.startsWith('mockUser'))) {
        Array.from(participants.keys()).forEach(k => {
            if (k.startsWith('mockUser')) _mockRemoveParticipant(k);
        })
    }
  }, [showMockUI, _mockAddParticipant, _mockRemoveParticipant, participants]);


  if (!isInCall && !isConnecting) {
    // This view should ideally only be rendered when isInCall or isConnecting is true.
    // The parent component should handle the logic to show/hide VideoCallView.
    // For now, providing a button to start a mock call for development.
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <h1 className="text-2xl mb-4">Video Call Interface</h1>
        <p className="mb-2">Not currently in a call.</p>
        <button 
          onClick={() => {
            initiateCall('mock-room-ui-dev');
            // Simulate local stream setup for UI
            const mockStream = new MediaStream();
            // You might need to use a real stream or mock MediaStreamTrack for full control button testing
            // For now, the context handles local participant addition when localStream is set.
            // setLocalStream(mockStream); // This would be done by WebRTC logic
          }}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-white"
        >
          Start Mock Call (Dev)
        </button>
         <button 
          onClick={() => setShowMockUI(!showMockUI)}
          className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded text-white"
        >
          {showMockUI ? "Hide" : "Show"} Mock Participants (Dev)
        </button>
        {showMockUI && participants.size > 0 && (
            <div className="mt-4 flex space-x-2">
                <button onClick={() => _mockToggleParticipantVideo('mockUser1')} className="bg-yellow-500 px-2 py-1 rounded">Toggle Alice Video</button>
                <button onClick={() => _mockToggleParticipantAudio('mockUser2')} className="bg-yellow-500 px-2 py-1 rounded">Toggle Bob Audio</button>
            </div>
        )}
      </div>
    );
  }
  
  const localParticipant = participants.get('localUser'); // Assuming 'localUser' is the key for the local participant
  const remoteParticipantsArray = Array.from(participants.values()).filter(p => !p.isLocal);
  
  // Find if anyone is screen sharing
  const screenSharingParticipant = Array.from(participants.values()).find(p => p.isScreenSharing && p.screenStream);

  // Determine grid layout based on number of participants and screen sharing status
  let mainViewParticipant: Participant | undefined = screenSharingParticipant;
  let thumbnailParticipants: Participant[] = [];

  if (screenSharingParticipant) {
    thumbnailParticipants = Array.from(participants.values()).filter(p => p.id !== screenSharingParticipant.id);
  } else {
    // If no screen share, default to a grid or speaker view (simplified for now)
    // For simplicity, we'll just list all participants if no screen share.
    // A more complex app might have a "main speaker" logic here.
    // If there's a local participant and others, local might be a thumbnail or main view depending on preference.
    // For now, let's just make everyone a "thumbnail" if no screen share, for a simple grid.
    thumbnailParticipants = Array.from(participants.values());
  }


  // Grid layout for thumbnails
  const numThumbnails = thumbnailParticipants.length;
  let thumbnailGridCols = 'grid-cols-1'; // Default for 1 thumbnail
  if (numThumbnails === 2) thumbnailGridCols = 'grid-cols-2';
  else if (numThumbnails === 3 || numThumbnails === 4) thumbnailGridCols = 'grid-cols-2'; // Or grid-cols-3, grid-cols-4
  else if (numThumbnails > 4) thumbnailGridCols = 'grid-cols-3'; // Adjust as needed
  // Max height for thumbnail area if main view is present
  const thumbnailAreaMaxHeight = mainViewParticipant ? 'max-h-48 md:max-h-64' : 'h-full';


  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col h-screen w-screen overflow-hidden">
      <ConnectionStatusOverlay />
      
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* Main View (for screen share or focused participant) */}
        {mainViewParticipant && (
          <div className="flex-grow flex items-center justify-center p-2 md:p-4 bg-black">
            <div className="w-full h-full max-w-full max-h-full">
              <ParticipantTile
                participant={mainViewParticipant}
                isLocal={mainViewParticipant.isLocal}
                isActiveSpeaker={false} // Active speaker logic can be added here
              />
            </div>
          </div>
        )}

        {/* Thumbnails Area */}
        <div className={`p-2 md:p-4 bg-slate-800 ${mainViewParticipant ? thumbnailAreaMaxHeight : 'flex-grow'} overflow-y-auto`}>
          {thumbnailParticipants.length > 0 && (
            <div className={`grid gap-2 md:gap-4 ${thumbnailGridCols}`}>
              {thumbnailParticipants.map((p) => (
                <div key={p.id} className="aspect-video"> {/* Maintain aspect ratio for thumbnails */}
                  <ParticipantTile
                    participant={p}
                    isLocal={p.isLocal}
                    isActiveSpeaker={false} // Active speaker logic for thumbnails
                  />
                </div>
              ))}
            </div>
          )}
          {(participants.size === 0 && isInCall) && (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                <p>Waiting for others to join...</p>
            </div>
          )}
        </div>
      </div>

      {isInCall && <VideoControls onHangUp={leaveCall} />}
    </div>
  );
};

export default VideoCallView;
