import React, { useEffect, useRef } from 'react';
import { UserCircleIcon, MicrophoneIcon, VideoCameraIcon, VideoCameraSlashIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { Participant } from '@/contexts/VideoCallContext'; // Adjust path as needed

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant, isLocal = false, isActiveSpeaker = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);

  const {
    name,
    audioEnabled = false,
    videoEnabled = false, // Webcam video status
    stream, // Webcam/audio stream
    screenStream, // Screen share stream
    isScreenSharing, // Is this participant actively sharing their screen
    id: participantId,
  } = participant;

  const effectiveStream = isScreenSharing && screenStream ? screenStream : stream;
  const effectiveVideoRef = isScreenSharing && screenStream ? screenShareVideoRef : videoRef;
  const effectiveVideoEnabled = isScreenSharing && screenStream ? true : videoEnabled; // Screen share is always "video on" if stream exists

  useEffect(() => {
    // Handle webcam/audio stream
    if (videoRef.current) {
      if (stream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
    // Handle screen share stream
    if (screenShareVideoRef.current) {
      if (screenStream) {
        screenShareVideoRef.current.srcObject = screenStream;
      } else {
        screenShareVideoRef.current.srcObject = null;
      }
    }
  }, [stream, screenStream]);

  const displayName = name || (isLocal ? 'You' : `User ${participantId.substring(0, 6)}`);
  const tileLabel = isScreenSharing ? `${displayName}'s Screen` : displayName;

  // If this tile is for displaying a screen share, we might want a different layout or indication
  // For now, we'll use the same tile structure but prioritize showing the screenStream if it exists and isScreenSharing is true.

  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-slate-800 rounded-lg shadow-lg overflow-hidden h-full w-full group
                  ${isActiveSpeaker && !isScreenSharing ? 'ring-4 ring-sky-500' : ''}
                  ${isScreenSharing ? 'border-2 border-green-500' : ''}`}
    >
      {/* Video Element - shows screenStream if sharing, otherwise webcam stream */}
      {effectiveStream && effectiveVideoEnabled ? (
        <video
          ref={effectiveVideoRef}
          autoPlay
          playsInline
          muted={isLocal && (!isScreenSharing || effectiveStream === stream)} // Mute local webcam/mic, but not necessarily local screen share audio (if any)
          className="w-full h-full object-contain bg-black" // object-contain for screen shares
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
          <UserCircleIcon className="w-24 h-24 md:w-32 md:h-32 text-slate-600" />
          {!effectiveVideoEnabled && (
            <div className="mt-2 flex items-center text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
              <VideoCameraSlashIcon className="w-4 h-4 mr-1" />
              {isScreenSharing ? 'Screen Share Ended' : 'Video Off'}
            </div>
          )}
        </div>
      )}

      {/* Overlay for Name and Status Icons */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate group-hover:opacity-100 opacity-0 transition-opacity duration-300">
            {tileLabel}
          </span>
          <div className="flex items-center space-x-2">
            {/* Audio status is always from the main audio producer, not screen share */}
            {audioEnabled ? (
              <SpeakerWaveIcon className="w-5 h-5 text-green-400" title="Microphone on" />
            ) : (
              <SpeakerXMarkIcon className="w-5 h-5 text-red-400" title="Microphone off" />
            )}
            
            {/* Video status depends on what's being shown */}
            {effectiveVideoEnabled ? (
              <VideoCameraIcon className="w-5 h-5 text-green-400" title={isScreenSharing ? "Screen sharing active" : "Video on"} />
            ) : (
              <VideoCameraSlashIcon className="w-5 h-5 text-red-400" title={isScreenSharing ? "Screen share ended" : "Video off"} />
            )}
          </div>
        </div>
      </div>
       {isLocal && !effectiveStream && !isScreenSharing && ( // Show "Setting up camera" only for local webcam if no stream yet
         <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <p className="text-white">Setting up your camera...</p>
         </div>
       )}
    </div>
  );
};

export default ParticipantTile;
