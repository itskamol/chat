'use client';

import type React from 'react';

import { useState, useRef, useEffect } from 'react';
import type { User, Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface ChatWindowProps {
    currentUser: User | null;
    selectedContact: User | null;
    messages: Message[];
    onSendMessage: (message: string) => void;
}

export default function ChatWindow({
    currentUser,
    selectedContact,
    messages,
    onSendMessage,
}: ChatWindowProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    const formatTime = (timestamp: string) => {
        try {
            return format(new Date(timestamp), 'h:mm a');
        } catch (error) {
            return '';
        }
    };

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
        <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center space-x-3">
                <div className="relative">
                    <Avatar>
                        <AvatarFallback>
                            {getInitials(selectedContact.name)}
                        </AvatarFallback>
                    </Avatar>
                    {selectedContact.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
                <div>
                    <h2 className="font-medium">{selectedContact.name}</h2>
                    <p className="text-xs text-gray-500">
                        {selectedContact.online ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-gray-50">
                <div className="space-y-4">
                    {messages.map((msg, index) => {
                        const isCurrentUser = msg.senderId === currentUser?._id;
                        return (
                            <div
                                key={index}
                                className={`flex ${
                                    isCurrentUser
                                        ? 'justify-end'
                                        : 'justify-start'
                                }`}
                            >
                                <div className="flex items-end space-x-2 max-w-[70%]">
                                    {!isCurrentUser && (
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback>
                                                {getInitials(
                                                    selectedContact.name
                                                )}
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
                                        <p>{msg.message}</p>
                                        <p
                                            className={`text-xs mt-1 ${
                                                isCurrentUser
                                                    ? 'text-blue-100'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            {formatTime(msg.createdAt)}
                                        </p>
                                    </div>
                                    {isCurrentUser && (
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback>
                                                {currentUser
                                                    ? getInitials(
                                                          currentUser.name
                                                      )
                                                    : 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex space-x-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                    />
                    <Button type="submit" size="icon">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
