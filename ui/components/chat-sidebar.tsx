'use client';

import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface ChatSidebarProps {
    currentUser: User | null;
    contacts: User[];
    selectedContact: User | null;
    onSelectContact: (contact: User) => void;
    onLogout: () => void;
    onStartVideoCall: (contact: User | null) => void; // Added this property
}

export default function ChatSidebar({
    currentUser,
    contacts,
    selectedContact,
    onSelectContact,
    onLogout,
}: ChatSidebarProps) {
    // Get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    return (
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
            {/* Header with user info and logout */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Avatar>
                        <AvatarFallback>
                            {currentUser ? getInitials(currentUser.name) : 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{currentUser?.name}</p>
                        <p className="text-xs text-gray-500">
                            {currentUser?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    title="Logout"
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        type="search"
                        placeholder="Search contacts..."
                        className="pl-8 bg-gray-100 border-0"
                    />
                </div>
            </div>

            {/* Contacts list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    <h2 className="text-xs font-semibold text-gray-500 px-2 mb-2">
                        CONTACTS
                    </h2>
                    <div className="space-y-1">
                        {contacts.map((contact) => (
                            <button
                                key={contact._id}
                                className={`w-full flex items-center space-x-3 px-2 py-2 rounded-md text-left ${
                                    selectedContact?._id === contact._id
                                        ? 'bg-gray-100'
                                        : 'hover:bg-gray-50'
                                }`}
                                onClick={() => onSelectContact(contact)}
                            >
                                <div className="relative">
                                    <Avatar>
                                        <AvatarFallback>
                                            {getInitials(contact.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {contact.online && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                        {contact.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {contact.email}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
