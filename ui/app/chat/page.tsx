// filepath: /home/dev/Desktop/chat./my-chat-server/ui/app/chat/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

import ChatSidebar from '@/components/chat-sidebar';
import ChatWindow from '@/components/chat-window'; // Assuming ChatWindowProps is exported or can be defined here
import type { Message } from '@/lib/types';
import NoSSR from '@/components/NoSSR'; // Import NoSSR component
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
    onMessageError,
} from '@/lib/socket';
import { MessageStatus, MessageType, User, validateFile } from '@chat/shared';

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
    const optimisticMessageRef = useRef<string | null>(null);
    const [isSendingFile, setIsSendingFile] = useState(false); // For loading state during file upload

    // State for video call UI
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [incomingCallVisible, setIncomingCallVisible] = useState(false);
    const [callerInfo, setCallerInfo] = useState<{
        name: string;
        roomId: string;
    } | null>(null);

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
                id: decodedToken.id,
                name: decodedToken.name,
                email: decodedToken.email,
            };
            setCurrentUser(user);

            emitUserOnline(user.id);
            emitGetOnlineUsers();

            const fetchContacts = async () => {
                try {
                    const response = await fetch('/api/users/contacts', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                            errorData.message || 'Failed to fetch contacts'
                        );
                    }
                    const contactData = await response.json();
                    const filteredContacts = contactData.data.filter(
                        (contact: User) => contact.id !== decodedToken.id
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
        if (!currentUser?.id) return;

        const currentSocket = getSocket();

        const removeReceiveMessageListener = onReceiveMessage((message) => {
            const newMessageReceived: Message = {
                ...message,
                createdAt: message.createdAt || new Date(),
            };
            if (
                (newMessageReceived.senderId === currentUser.id &&
                    newMessageReceived.receiverId === selectedContact?.id) ||
                (newMessageReceived.senderId === selectedContact?.id &&
                    newMessageReceived.receiverId === currentUser.id)
            ) {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    newMessageReceived,
                ]);
            } else {
                console.log(
                    'Received message for another chat: ',
                    newMessageReceived
                );
            }
        });

        const removeOnlineUsersListener = onOnlineUsersList(({ users }) => {
            console.log('Online users list:', users);
            setOnlineUserIds(users.map((u) => u.userId));
            setContacts((prevContacts) =>
                prevContacts.map((c) => ({
                    ...c,
                    online: users.some(
                        (u) => u.userId === c.id && u.status === 'online'
                    ),
                }))
            );
        });

        const removeUserStatusListener = onUserStatusChanged((data) => {
            setContacts((prevContacts) =>
                prevContacts.map((c) =>
                    c.id === data.userId
                        ? {
                              ...c,
                              online: data.status === 'online',
                              lastSeen: new Date(data.lastSeen),
                          }
                        : c
                )
            );
            if (data.status === 'online') {
                setOnlineUserIds((prev) => [
                    ...new Set([...prev, data.userId]),
                ]);
            } else {
                setOnlineUserIds((prev) =>
                    prev.filter((id) => id !== data.userId)
                );
            }
            if (selectedContact?.id === data.userId) {
                setSelectedContact((prev: any) =>
                    prev
                        ? {
                              ...prev,
                              online: data.status === 'online',
                              lastSeen: new Date(data.lastSeen),
                          }
                        : null
                );
            }
        });

        const removeMessageSentListener = onMessageSent((confirmation) => {
            console.log('Message sent confirmation:', confirmation);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticMessageRef.current &&
                    m.senderId === confirmation.senderId &&
                    m.receiverId === confirmation.receiverId &&
                    m.content === confirmation.message
                        ? {
                              ...m,
                              _id: confirmation.id,
                              delivered: confirmation.delivered,
                              createdAt: new Date(confirmation.createdAt),
                          }
                        : m
                )
            );
            optimisticMessageRef.current = null; // Reset ref
        });

        const removeMessageErrorListener = onMessageError((err) => {
            console.error('Message send error:', err.error);
            // Potentially remove the optimistic message or mark it as failed
            if (optimisticMessageRef.current) {
                setMessages((prev) =>
                    prev.filter((m) => m.id !== optimisticMessageRef.current)
                );
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
        if (!selectedContact?.id || !currentUser?.id) {
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
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/get/${selectedContact.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.message || 'Failed to fetch messages'
                    );
                }
                const messagesData = await response.json();
                setMessages(
                    messagesData.data.map((msg: any) => ({
                        ...msg,
                        createdAt: new Date(msg.createdAt),
                    })) || []
                );
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

    // const validateFile = (file: File, fileType: string): string | null => {
    //     // File size check (10MB limit)
    //     const maxSize = 10 * 1024 * 1024; // 10MB
    //     if (file.size > maxSize) {
    //         return 'File size must be less than 10MB';
    //     }

    //     // File type validation
    //     const allowedTypes: Record<string, string[]> = {
    //         image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    //         video: ['video/mp4', 'video/webm', 'video/ogg'],
    //         audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'],
    //         file: [
    //             'application/pdf',
    //             'text/plain',
    //             'application/msword',
    //             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    //         ],
    //     };

    //     if (
    //         allowedTypes[fileType] &&
    //         !allowedTypes[fileType].includes(file.type)
    //     ) {
    //         return `Invalid file type for ${fileType}. Allowed types: ${allowedTypes[
    //             fileType
    //         ].join(', ')}`;
    //     }

    //     return null;
    // };

    const uploadFileWithRetry = async (
        formData: FormData,
        tempId: string,
        maxRetries: number = 3
    ): Promise<void> => {
        let retryCount = 0;

        const attemptUpload = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                const token = localStorage.getItem('jwt');
                const xhr = new XMLHttpRequest();

                xhr.open(
                    'POST',
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/upload`,
                    true
                );
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.timeout = 30000; // 30 second timeout

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round(
                            (event.loaded / event.total) * 100
                        );
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === tempId
                                    ? {
                                          ...m,
                                          uploadProgress: progress,
                                          status: MessageStatus.PENDING,
                                      }
                                    : m
                            )
                        );
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                        try {
                            const savedMessage: Message = JSON.parse(
                                xhr.responseText
                            );
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === tempId
                                        ? {
                                              ...savedMessage,
                                              createdAt:
                                                  savedMessage.createdAt ||
                                                  new Date(),
                                              status: MessageStatus.SENT,
                                              uploadProgress: 100,
                                          }
                                        : m
                                )
                            );
                        } catch (parseError) {
                            console.error('Parse error:', parseError);
                            reject(new Error('Invalid server response'));
                        }
                    } else {
                        reject(
                            new Error(
                                `Server error: ${xhr.status} ${xhr.statusText}`
                            )
                        );
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Upload timeout'));

                xhr.send(formData);
            });
        };

        while (retryCount < maxRetries) {
            try {
                await attemptUpload();
                setIsSendingFile(false);
                optimisticMessageRef.current = null;
                return;
            } catch (error: any) {
                retryCount++;
                console.error(`Upload attempt ${retryCount} failed:`, error);

                if (retryCount < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, retryCount) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));

                    // Update UI to show retry
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === tempId
                                ? ({
                                      ...m,
                                      status: 'retrying',
                                      uploadProgress: 0,
                                      message: `Retrying upload... (${retryCount}/${maxRetries})`,
                                  } as unknown as Message)
                                : m
                        )
                    );
                } else {
                    // Final failure
                    setError(
                        `Upload failed after ${maxRetries} attempts: ${error.message}`
                    );
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === tempId
                                ? {
                                      ...m,
                                      status: MessageStatus.FAILED,
                                      uploadProgress: 0,
                                  }
                                : m
                        )
                    );
                }
            }
        }

        setIsSendingFile(false);
        optimisticMessageRef.current = null;
    };

    const handleSendMessage = async (
        text: string,
        file?: File,
        fileType?: 'text' | 'image' | 'video' | 'audio' | 'file'
    ) => {
        if (!currentUser?.id || !selectedContact?.id) return;
        if (!text.trim() && !file) return;

        // File validation using shared utility
        if (file) {
            const validation = validateFile(file);
            if (!validation.isValid) {
                setError(validation.error || 'Invalid file');
                return;
            }
        }

        const tempId = `temp-${Date.now()}`;
        optimisticMessageRef.current = tempId;

        if (file && fileType) {
            setIsSendingFile(true);
            setError(null);

            const formData = new FormData();
            formData.append('mediaFile', file, file.name);
            formData.append('senderId', currentUser.id);
            formData.append('receiverId', selectedContact.id);
            formData.append('type', fileType);
            if (text.trim()) formData.append('originalMessage', text.trim());

            const optimisticFileMessage: Message = {
                id: tempId,
                senderId: currentUser.id,
                receiverId: selectedContact.id,
                content: text.trim() || `Sending ${fileType}...`,
                type: MessageType.FILE, // Use MessageType.FILE for file messages
                fileName: file.name,
                fileSize: file.size,
                fileMimeType: file.type,
                fileUrl: URL.createObjectURL(file),
                createdAt: new Date(),
                status: MessageStatus.PENDING,
                uploadProgress: 0,
            };

            setMessages((prevMessages) => [
                ...prevMessages,
                optimisticFileMessage,
            ]);

            try {
                await uploadFileWithRetry(formData, tempId);
            } catch (error) {
                console.error('File upload error:', error);
                setError('Failed to upload file. Please try again.');
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
            }
        } else if (text.trim()) {
            // Handle text message
            const messageData = {
                senderId: currentUser.id,
                receiverId: selectedContact.id,
                content: text.trim(),
                type: MessageType.TEXT, // Use MessageType.TEXT for text messages
            };

            const optimisticTextMessage: Message = {
                id: tempId,
                ...messageData,
                type: MessageType.TEXT, // Explicitly set to a valid type
                createdAt: new Date(),
                status: MessageStatus.SENT,
            };
            setMessages((prevMessages) => [
                ...prevMessages,
                optimisticTextMessage,
            ]);
            emitSendMessage(messageData); // Socket.IO for real-time text
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt');
        if (currentUser) {
            // emitUserOffline(currentUser.id); // If you implement this on backend
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

    const contactsWithOnlineStatus = contacts.map((contact) => ({
        ...contact,
        online: onlineUserIds.includes(contact.id),
    }));

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
            // videoCall.initiateCall(contact.id); // Use contact.id or a new unique room ID
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
                    onStartVideoCall={() =>
                        handleStartVideoCall(selectedContact)
                    } // Pass handler
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
        <NoSSR
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    Loading chat...
                </div>
            }
        >
            <VideoCallProvider>
                <ChatPageContent />
            </VideoCallProvider>
        </NoSSR>
    );
}
