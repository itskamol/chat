import { type Message } from '@/lib/types';
import { getFileIcon } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onRetry?: () => void;
}

export function MessageBubble({
  message,
  isCurrentUser,
  onRetry,
}: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  const renderFilePreview = () => {
    if (!message.fileUrl) return null;

    switch (message.type) {
      case 'image':
        return (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            aria-label={`View image: ${message.fileName || 'attached image'}`}
          >
            <img
              src={message.fileUrl}
              alt={message.fileName || 'image attachment'}
              className="max-w-xs max-h-64 rounded object-contain"
              loading="lazy"
            />
          </a>
        );

      case 'video':
        return (
          <video
            controls
            src={message.fileUrl}
            className="max-w-xs max-h-64 rounded object-contain"
            aria-label={`Video message: ${message.fileName || 'attached video'}`}
          >
            Your browser does not support the video element.
          </video>
        );

      case 'audio':
        return (
          <audio
            controls
            src={message.fileUrl}
            className="w-full max-w-xs h-12 rounded"
            aria-label={`Audio message: ${message.fileName || 'voice note'}`}
          >
            Your browser does not support the audio element.
          </audio>
        );

      case 'file':
        const FileIcon = getFileIcon(message.fileMimeType);
        return (
          <div className={`p-1 ${!isCurrentUser ? 'bg-opacity-20 bg-gray-500 rounded-md' : ''}`}>
            <div className="flex items-center">
              <FileIcon className="w-4 h-4 mr-2" />
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-medium truncate" title={message.fileName || 'Attached file'}>
                  {message.fileName || 'Attached File'}
                </p>
                {message.fileSize && (
                  <p className="text-xs opacity-80">
                    {(message.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={message.fileName || 'download'}
              className={`mt-2 inline-block text-xs px-3 py-1 rounded-full transition-colors
                ${isCurrentUser
                  ? 'bg-blue-400 hover:bg-blue-300 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
              aria-label={`Download ${message.fileName || 'file'}`}
            >
              Download File
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex items-end space-x-2 max-w-[70%]">
        {!isCurrentUser && (
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {message.senderName ? getInitials(message.senderName) : 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div
          className={`px-4 py-2 rounded-lg ${
            isCurrentUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
          }`}
        >
          {renderFilePreview()}
          {message.content && <p>{message.content}</p>}
          
          <div className="flex items-center justify-between mt-1">
            <p
              className={`text-xs ${
                isCurrentUser ? 'text-blue-100 opacity-80' : 'text-gray-500 opacity-80'
              }`}
            >
              {formatTime(message.createdAt as unknown as string)}
              {message.status === 'Pending' && message.uploadProgress !== undefined && (
                <span className="ml-1">
                  {message.uploadProgress < 100
                    ? `Uploading ${message.uploadProgress}%`
                    : 'Processing...'}
                </span>
              )}
            </p>
            
            {message.status === 'Failed' && isCurrentUser && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-red-400 hover:text-red-300 ml-2"
                onClick={onRetry}
              >
                Retry
              </Button>
            )}
          </div>
        </div>

        {isCurrentUser && (
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              {message.senderName ? getInitials(message.senderName) : 'U'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
