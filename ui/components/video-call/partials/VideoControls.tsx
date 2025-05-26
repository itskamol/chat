import React from 'react';
import {
  PhoneXMarkIcon,
  MicrophoneIcon as MicrophoneSolidIcon,
  VideoCameraIcon as VideoCameraSolidIcon,
  VideoCameraSlashIcon as VideoCameraSlashSolidIcon,
  SpeakerXMarkIcon as SpeakerXMarkSolidIcon,
  ComputerDesktopIcon as ScreenShareIcon,
  StopCircleIcon as StopScreenShareIcon,
} from '@heroicons/react/24/solid';
import { useVideoCall } from '@/contexts/VideoCallContext'; // Adjust path as needed

interface VideoControlsProps {
  onHangUp: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({ onHangUp }) => {
  const { 
    localAudioEnabled, 
    localVideoEnabled, 
    toggleLocalAudio, 
    toggleLocalVideo,
    isScreenSharing, // Added from context
    startScreenShare, // Added from context
    stopScreenShare,  // Added from context
    isInCall 
  } = useVideoCall();

  if (!isInCall) {
    return null;
  }

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 bg-opacity-90 p-4 z-50">
      <div className="max-w-lg mx-auto flex justify-center items-center space-x-3 sm:space-x-4">
        {/* Mute/Unmute Audio Button */}
        <button
          onClick={toggleLocalAudio}
          className={`p-2 sm:p-3 rounded-full transition-colors duration-150 ease-in-out
                      ${localAudioEnabled ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600 hover:bg-red-500'}
                      text-white focus:outline-none focus:ring-2 focus:ring-sky-500`}
          aria-label={localAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {localAudioEnabled ? (
            <MicrophoneSolidIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <SpeakerXMarkSolidIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>

        {/* Start/Stop Video Button */}
        <button
          onClick={toggleLocalVideo}
          className={`p-2 sm:p-3 rounded-full transition-colors duration-150 ease-in-out
                      ${localVideoEnabled ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600 hover:bg-red-500'}
                      text-white focus:outline-none focus:ring-2 focus:ring-sky-500`}
          aria-label={localVideoEnabled ? 'Stop video' : 'Start video'}
        >
          {localVideoEnabled ? (
            <VideoCameraSolidIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <VideoCameraSlashSolidIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>

        {/* Screen Share Button */}
        <button
          onClick={handleToggleScreenShare}
          className={`p-2 sm:p-3 rounded-full transition-colors duration-150 ease-in-out
                      ${isScreenSharing ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-600 hover:bg-slate-500'}
                      text-white focus:outline-none focus:ring-2 focus:ring-sky-500`}
          aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
        >
          {isScreenSharing ? (
            <StopScreenShareIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <ScreenShareIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>

        {/* Hang Up Button */}
        <button
          onClick={onHangUp}
          className="p-2 sm:p-3 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Hang up call"
        >
          <PhoneXMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        
      </div>
    </div>
  );
};

export default VideoControls;
