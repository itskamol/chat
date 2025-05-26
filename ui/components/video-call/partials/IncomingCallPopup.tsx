import React from 'react';
import { PhoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid';

interface IncomingCallPopupProps {
  callerName?: string; // Optional: display name of the caller
  roomId?: string; // Optional: The room ID for the call
  onAccept: () => void;
  onDecline: () => void;
  isVisible: boolean;
}

const IncomingCallPopup: React.FC<IncomingCallPopupProps> = ({
  callerName = 'Someone',
  roomId,
  onAccept,
  onDecline,
  isVisible,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 md:p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h2 className="text-2xl font-semibold text-white mb-2">Incoming Call</h2>
        <p className="text-slate-300 mb-1">
          {callerName} is calling.
        </p>
        {roomId && <p className="text-xs text-slate-400 mb-6">Room: {roomId.substring(0,12)}...</p>}


        <div className="flex justify-center space-x-4 mt-6">
          <button
            onClick={onDecline}
            className="flex flex-col items-center px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Decline call"
          >
            <PhoneXMarkIcon className="h-7 w-7" />
            <span className="mt-1 text-sm">Decline</span>
          </button>
          <button
            onClick={onAccept}
            className="flex flex-col items-center px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Accept call"
          >
            <PhoneIcon className="h-7 w-7" />
             <span className="mt-1 text-sm">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
