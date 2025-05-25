// filepath: /home/dev/Desktop/chat./my-chat-server/ui/app/chat/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import type { Socket } from 'socket.io-client';

import ChatSidebar from '@/components/chat-sidebar';
import ChatWindow, { ChatWindowProps } from '@/components/chat-window'; // Assuming ChatWindowProps is exported or can be defined here
import type { User, Message } from '@/lib/types';
import { VideoCallProvider, useVideoCall } from '@/contexts/VideoCallContext'; // Import Provider and Hook
import VideoCallView from '@/components/video-call/VideoCallView'; // Import VideoCallView
import IncomingCallPopup from '@/components/video-call/partials/IncomingCallPopup'; // Import IncomingCallPopup
import {
    getSocket,
    disconnectSocket,
    emitUserOnline,
    emitSendMessage,
    emitGetOnlineUsers,
    onReceiveMessage,
    onOnlineUsersList,
    onUserStatusChanged,
    onMessageSent,
    onMessageError
} from '@/lib/socket';

interface DecodedToken {
    id: string;
    name: string;
    email: string;
    exp: number;
    iat: number;
}

export default function ChatPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedContact, setSelectedContact] = useState<User | null>(null);
    const [contacts, setContacts] = useState<User[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const optimisticMessageRef = useRef<string | null>(null); // To store temp ID of optimistic message

    // State for video call UI
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [incomingCallVisible, setIncomingCallVisible] = useState(false);
    const [callerInfo, setCallerInfo] = useState<{ name: string, roomId: string } | null>(null);


    // Effect for initialization, authentication, and fetching initial data
    useEffect(() => {
        const token = localStorage.getItem('jwt');
        if (!token) {
            router.push('/');
            return;
        }

        try {
            const decodedToken = jwtDecode<DecodedToken>(token);
            if (decodedToken.exp * 1000 < Date.now()) {
                localStorage.removeItem('jwt');
                router.push('/');
                return;
            }

            const user: User = {
                _id: decodedToken.id,
                name: decodedToken.name,
                email: decodedToken.email,
                online: true, 
            };
            setCurrentUser(user);

            const currentSocket = getSocket();

            emitUserOnline(user._id);
            emitGetOnlineUsers();

            const fetchContacts = async () => {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/contacts`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                            errorData.message || 'Failed to fetch contacts'
                        );
                    }
                    const contactData = await response.json();
                    const filteredContacts = contactData.data.filter(
                        (contact: User) => contact._id !== decodedToken.id
                    );
                    setContacts(filteredContacts);
                } catch (err: any) {
                    console.error('Failed to fetch contacts:', err);
                    setError(err.message || 'Could not load contacts.');
                }
            };

            fetchContacts();
        } catch (err) {
            console.error('Invalid token or setup failed:', err);
            localStorage.removeItem('jwt');
            router.push('/');
        } finally {
            setLoading(false);
        }

        return () => {
            // disconnectSocket(); 
        };
    }, [router]);

    // Effect for handling socket events
    useEffect(() => {
        if (!currentUser?._id) return;

        const currentSocket = getSocket();

        const removeReceiveMessageListener = onReceiveMessage((message) => {
            const newMessageReceived: Message = {
                ...message,
                createdAt: new Date(message.createdAt) 
            };
            if (
                (newMessageReceived.senderId === currentUser._id && newMessageReceived.receiverId === selectedContact?._id) ||
                (newMessageReceived.senderId === selectedContact?._id && newMessageReceived.receiverId === currentUser._id)
            ) {
                setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
            } else {
                console.log("Received message for another chat: ", newMessageReceived);
            }
        });

        const removeOnlineUsersListener = onOnlineUsersList((users) => {
            console.log('Online users list:', users);
            setOnlineUserIds(users.map(u => u.userId));
            setContacts(prevContacts => prevContacts.map(c => ({
                ...c,
                online: users.some(u => u.userId === c._id && u.status === 'online')
            })));
        });

        const removeUserStatusListener = onUserStatusChanged((data) => {
            setContacts(prevContacts => prevContacts.map(c =>
                c._id === data.userId ? { ...c, online: data.status === 'online', lastSeen: new Date(data.lastSeen) } : c
            ));
            if (data.status === 'online') {
                setOnlineUserIds(prev => [...new Set([...prev, data.userId])]);
            } else {
                setOnlineUserIds(prev => prev.filter(id => id !== data.userId));
            }
            if (selectedContact?._id === data.userId) {
                setSelectedContact(prev => prev ? {...prev, online: data.status === 'online', lastSeen: new Date(data.lastSeen)} : null);
            }
        });
        
        const removeMessageSentListener = onMessageSent((confirmation) => {
            console.log('Message sent confirmation:', confirmation);
            setMessages(prev => prev.map(m => 
                m._id === optimisticMessageRef.current && m.senderId === confirmation.senderId && m.receiverId === confirmation.receiverId && m.message === confirmation.message ? 
                {...m, _id: confirmation._id, delivered: confirmation.delivered, createdAt: new Date(confirmation.createdAt) } : 
                m
            ));
            optimisticMessageRef.current = null; // Reset ref
        });

        const removeMessageErrorListener = onMessageError((err) => {
            console.error('Message send error:', err.error);
            // Potentially remove the optimistic message or mark it as failed
            if (optimisticMessageRef.current) {
                setMessages(prev => prev.filter(m => m._id !== optimisticMessageRef.current));
                optimisticMessageRef.current = null;
            }
        });

        return () => {
            removeReceiveMessageListener();
            removeOnlineUsersListener();
            removeUserStatusListener();
            removeMessageSentListener();
            removeMessageErrorListener();
        };
    }, [currentUser, selectedContact]);

    // Effect for fetching messages when a contact is selected
    useEffect(() => {
        if (!selectedContact?._id || !currentUser?._id) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('jwt');
                if (!token) {
                    router.push('/');
                    return;
                }
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/get/${selectedContact._id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch messages');
                }
                const messagesData = await response.json();
                setMessages(messagesData.data.map((msg: any) => ({...msg, createdAt: new Date(msg.createdAt)})) || []);
            } catch (err: any) {
                console.error('Failed to fetch messages:', err);
                setError(err.message || 'Could not load messages.');
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [selectedContact, currentUser, router]);

    const handleContactSelect = (contact: User) => {
        setSelectedContact(contact);
    };

    const handleSendMessage = (text: string) => {
        if (!currentUser?._id || !selectedContact?._id || !text.trim()) return;

        const messageData = {
            senderId: currentUser._id,
            receiverId: selectedContact._id,
            message: text,
        };
        
        const tempId = `temp-${Date.now()}`;
        optimisticMessageRef.current = tempId; // Store temp ID

        const optimisticMessage: Message = {
            _id: tempId, 
            ...messageData,
            createdAt: new Date(), 
            delivered: false 
        };
        setMessages(prevMessages => [...prevMessages, optimisticMessage]);

        emitSendMessage(messageData); 
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt');
        if (currentUser) {
            // emitUserOffline(currentUser._id); // If you implement this on backend
        }
        disconnectSocket();
        router.push('/');
    };

    if (loading && !contacts.length && !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading chat...
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen text-red-500">
                Error: {error}
            </div>
        );
    }

    const contactsWithOnlineStatus = contacts.map(contact => ({
        ...contact,
        online: onlineUserIds.includes(contact._id)
    }));

    // --- Mock Incoming Call ---
    // Simulate receiving an incoming call for UI testing
    useEffect(() => {
        // Example: Simulate an incoming call after 10 seconds for 'test-user'
        // In a real app, this would be triggered by a WebSocket event.
        const timer = setTimeout(() => {
            // console.log("Simulating incoming call...");
            // setCallerInfo({ name: 'Mock Caller', roomId: 'mock-room-123' });
            // setIncomingCallVisible(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    const handleAcceptCall = () => {
        if (callerInfo) {
            // Here you would use the useVideoCall hook's functions if VideoCallProvider was above this component.
            // For now, directly setting state to show VideoCallView.
            // videoCall.joinCall(callerInfo.roomId); // This would be the ideal way
            setShowVideoCall(true); 
        }
        setIncomingCallVisible(false);
    };

    const handleDeclineCall = () => {
        setIncomingCallVisible(false);
        setCallerInfo(null);
    };
    
    const handleStartVideoCall = (contact: User | null) => {
        if (contact) {
            // videoCall.initiateCall(contact._id); // Use contact._id or a new unique room ID
            setShowVideoCall(true); // Directly show the view for now
            console.log(`Starting video call with ${contact.name}`);
        }
    };

    const ChatPageContent = () => {
        // Access video call context if needed for more complex interactions here
        // const videoCall = useVideoCall(); 
        
        // If showVideoCall is true, render VideoCallView, otherwise the chat UI
        if (showVideoCall) {
            return <VideoCallView />;
        }

        return (
            <div className="flex h-screen bg-gray-50">
                <ChatSidebar
                    currentUser={currentUser}
                    contacts={contactsWithOnlineStatus}
                    selectedContact={selectedContact}
                    onSelectContact={handleContactSelect}
                    onLogout={handleLogout}
                    onStartVideoCall={handleStartVideoCall} // Pass handler
                />
                <ChatWindow
                    currentUser={currentUser}
                    selectedContact={selectedContact}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onStartVideoCall={() => handleStartVideoCall(selectedContact)} // Pass handler
                />
                <IncomingCallPopup
                    isVisible={incomingCallVisible}
                    callerName={callerInfo?.name}
                    roomId={callerInfo?.roomId}
                    onAccept={handleAcceptCall}
                    onDecline={handleDeclineCall}
                />
            </div>
        );
    };

    return (
        <VideoCallProvider>
            <ChatPageContent />
        </VideoCallProvider>
    );
}