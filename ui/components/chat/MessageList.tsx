import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message, User } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  currentUser: User | null;
  selectedContact: User | null;
  onRetry?: (message: Message) => void;
}

export function MessageList({
  messages,
  currentUser,
  selectedContact,
  onRetry,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-500">
            Select a contact to start chatting
          </h3>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4 bg-gray-50">
      <div className="space-y-4">
        {messages.map((msg, index) => {
          const isCurrentUser = msg.senderId === currentUser?._id;

          return (
            <MessageBubble
              key={msg._id || index}
              message={msg}
              isCurrentUser={isCurrentUser}
              onRetry={onRetry ? () => onRetry(msg) : undefined}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
