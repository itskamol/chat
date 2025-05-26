import React from 'react';
import { useVideoCall } from '@/contexts/VideoCallContext'; // Adjust path as needed
import { InformationCircleIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ConnectionStatusOverlay: React.FC = () => {
  const { isConnecting, error, isInCall } = useVideoCall();

  let message: string | null = null;
  let icon: React.ReactNode | null = null;
  let bgColor = 'bg-slate-700'; // Default background

  if (isConnecting) {
    message = 'Connecting...';
    icon = <ArrowPathIcon className="h-8 w-8 text-sky-300 animate-spin" />;
    bgColor = 'bg-sky-600';
  } else if (error) {
    message = `Error: ${error}`;
    icon = <ExclamationTriangleIcon className="h-8 w-8 text-red-300" />;
    bgColor = 'bg-red-600';
  } else if (isInCall) {
    // Could have a temporary "Connected" message, but usually, the call view itself is the indicator.
    // For now, let's not show anything if connected and no error/connecting state.
    // message = 'Connected';
    // icon = <CheckCircleIcon className="h-8 w-8 text-green-300" />;
    // bgColor = 'bg-green-600';
    // setTimeout(() => setVisible(false), 2000); // Example: hide after 2s
    return null; // No overlay needed if successfully in call and stable
  } else if (!isInCall && !isConnecting && !error) {
    // This case might be when the call has ended or not yet started.
    // If VideoCallView is still mounted, you might want a "Call Ended" message.
    // However, usually, the component would unmount or be replaced.
    // For now, we will not show an overlay for "Call Ended" here,
    // assuming the UI will navigate away or VideoCallView will unmount.
    return null;
  }
  
  // If no message, don't render the overlay
  if (!message) {
    return null;
  }

  return (
    <div 
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg
                  flex items-center space-x-3 text-white ${bgColor} 
                  transition-all duration-300 ease-in-out`}
    >
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default ConnectionStatusOverlay;
