'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Send,
    Mic,
    StopCircle,
    Trash2,
    Paperclip,
    XCircle,
    FileText,
    Image as ImageIcon,
    Video as VideoIcon,
    Headphones,
    File as FileIcon, // Added media type icons
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { User } from '@chat/shared';

interface ChatWindowProps {
    currentUser: User | null;
    selectedContact: User | null;
    messages: Message[];
    onSendMessage: (
        message: string,
        file?: File,
        fileType?: 'text' | 'image' | 'video' | 'audio' | 'file'
    ) => Promise<void>;
    onStartVideoCall: (contact: User | null) => void; // Added this property
}

const formatRecordingTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
};

const ALLOWED_FILE_TYPES =
    'image/jpeg, image/png, image/gif, video/mp4, audio/mpeg, audio/webm, application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function ChatWindow({
    currentUser,
    selectedContact,
    messages,
    onSendMessage,
}: ChatWindowProps) {
    // All hooks at the top level
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

    const {
        isRecording,
        audioBlob,
        recordingTime,
        startRecording,
        stopRecording,
        resetAudioBlob,
    } = useAudioRecorder();

    // Scroll to bottom effect
    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Clear selected file if audio recording starts or an audio blob is ready
    useEffect(() => {
        if (isRecording || audioBlob) {
            setSelectedFile(null);
        }
    }, [isRecording, audioBlob]);

    // Handle file selection and audio recording interactions
    useEffect(() => {
        let previewUrl: string | null = null;

        if (selectedFile) {
            // Stop recording if active
            if (isRecording && typeof stopRecording === 'function') {
                stopRecording();
            }
            // Clear audio blob
            if (typeof resetAudioBlob === 'function') {
                resetAudioBlob();
            }
            // Create preview URL for media files
            if (
                selectedFile.type.startsWith('image/') ||
                selectedFile.type.startsWith('video/')
            ) {
                previewUrl = URL.createObjectURL(selectedFile);
                setFilePreviewUrl(previewUrl);
            }
        }

        // Cleanup function
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setFilePreviewUrl(null);
            }
        };
    }, [selectedFile, isRecording, stopRecording, resetAudioBlob]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (audioBlob) {
            handleSendAudio();
        } else if (selectedFile) {
            handleSendFile();
        } else if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleSendAudio = async () => {
        if (!audioBlob || !currentUser || !selectedContact) return;
        const audioFile = new File(
            [audioBlob],
            `voice-note-${Date.now()}.webm`,
            { type: audioBlob.type || 'audio/webm' }
        );
        onSendMessage(inputValue.trim(), audioFile, 'audio'); // Pass caption if any
        resetAudioBlob();
        setInputValue('');
    };

    const handleSendFile = async () => {
        if (!selectedFile || !currentUser || !selectedContact) return;

        let fileType = selectedFile.type.split('/')[0] || 'file'; // 'image', 'video', 'audio', or 'file'
        if (!['image', 'video', 'audio'].includes(fileType)) {
            fileType = 'file'; // Default to generic 'file' if not common media type
        }

        onSendMessage(
            inputValue.trim(),
            selectedFile,
            fileType as 'image' | 'video' | 'audio' | 'file'
        ); // Pass caption if any
        setSelectedFile(null);
        setInputValue('');
    };

    const handleRecordButtonClick = () => {
        setSelectedFile(null); // Clear any selected file
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleDiscardAudio = () => {
        if (isRecording) stopRecording();
        resetAudioBlob();
        setInputValue('');
    };

    const handleAttachmentClick = () => {
        if (isRecording) stopRecording();
        resetAudioBlob(); // Clear any recorded audio
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (filePreviewUrl) {
            // Clean up previous preview if any
            URL.revokeObjectURL(filePreviewUrl);
            setFilePreviewUrl(null);
        }
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                // 10MB limit
                alert('File is too large. Maximum size is 10MB.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setInputValue('');
        } else {
            setSelectedFile(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDiscardFile = () => {
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
            setFilePreviewUrl(null);
        }
        setSelectedFile(null);
        setInputValue('');
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
                            {getInitials(selectedContact.name ?? '')}
                        </AvatarFallback>
                    </Avatar>
                    {(selectedContact as any).online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
                <div>
                    <h2 className="font-medium">{selectedContact.name}</h2>
                    <p className="text-xs text-gray-500">
                        {(selectedContact as any).online ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-gray-50">
                <div className="space-y-4">
                    {messages.map((msg, index) => {
                        const isCurrentUser = msg.senderId === currentUser?.id;
                        return (
                            <div
                                key={msg.id || index} // Use msg._id if available, otherwise index
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
                                                    selectedContact.name ?? '' // Ensure name is not undefined
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
                                        {/* Refactored Message content rendering */}
                                        {(() => {
                                            console.log(msg.fileUrl);
                                            const chatServiceBaseUrl =
                                                process.env
                                                    .NEXT_PUBLIC_API_BASE_URL_CHAT_SERVICE;
                                            const fullFileUrl =
                                                msg.fileUrl &&
                                                !msg.fileUrl.startsWith(
                                                    'blob:'
                                                ) &&
                                                !msg.fileUrl.startsWith(
                                                    'http'
                                                ) &&
                                                chatServiceBaseUrl // Check if base URL is defined
                                                    ? `${chatServiceBaseUrl}${msg.fileUrl}`
                                                    : msg.fileUrl;

                                            const caption =
                                                msg.content ||
                                                (msg.type !== 'text' &&
                                                msg.fileUrl
                                                    ? msg.content
                                                    : null);

                                            const renderCaption = (
                                                text: string | undefined | null
                                            ) =>
                                                text ? (
                                                    <p className="mt-1 text-sm opacity-90">
                                                        {text}
                                                    </p>
                                                ) : null;

                                            let icon = null;
                                            let content = null;

                                            switch (msg.type) {
                                                case 'audio':
                                                    icon = (
                                                        <Headphones
                                                            size={16}
                                                            className="mr-1.5 flex-shrink-0"
                                                        />
                                                    );
                                                    content = fullFileUrl ? (
                                                        <audio
                                                            controls
                                                            src={fullFileUrl}
                                                            className="w-full max-w-xs h-12 rounded"
                                                            aria-label={`Audio message: ${
                                                                msg.fileName ||
                                                                'voice note'
                                                            }`}
                                                        >
                                                            Your browser does
                                                            not support the
                                                            audio element.
                                                        </audio>
                                                    ) : (
                                                        <p>
                                                            {caption ||
                                                                msg.content}
                                                        </p>
                                                    );
                                                    break;
                                                case 'image':
                                                    icon = (
                                                        <ImageIcon
                                                            size={16}
                                                            className="mr-1.5 flex-shrink-0"
                                                        />
                                                    );
                                                    content = fullFileUrl ? (
                                                        <a
                                                            href={fullFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`View image: ${
                                                                msg.fileName ||
                                                                'attached image'
                                                            }`}
                                                        >
                                                            <img
                                                                src={
                                                                    fullFileUrl
                                                                }
                                                                alt={
                                                                    msg.fileName ||
                                                                    'image attachment'
                                                                }
                                                                className="max-w-xs max-h-64 rounded object-contain"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <p>
                                                            {caption ||
                                                                msg.content}
                                                        </p>
                                                    );
                                                    break;
                                                case 'video':
                                                    icon = (
                                                        <VideoIcon
                                                            size={16}
                                                            className="mr-1.5 flex-shrink-0"
                                                        />
                                                    );
                                                    content = fullFileUrl ? (
                                                        <video
                                                            controls
                                                            src={fullFileUrl}
                                                            className="max-w-xs max-h-64 rounded object-contain"
                                                            aria-label={`Video message: ${
                                                                msg.fileName ||
                                                                'attached video'
                                                            }`}
                                                        >
                                                            Your browser does
                                                            not support the
                                                            video element.
                                                        </video>
                                                    ) : (
                                                        <p>
                                                            {caption ||
                                                                msg.content}
                                                        </p>
                                                    );
                                                    break;
                                                case 'file':
                                                    const isPdf =
                                                        msg.fileMimeType ===
                                                        'application/pdf';
                                                    icon = isPdf ? (
                                                        <FileText
                                                            size={16}
                                                            className="mr-1.5 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <FileIcon
                                                            size={16}
                                                            className="mr-1.5 flex-shrink-0"
                                                        />
                                                    );
                                                    content = fullFileUrl ? (
                                                        <div
                                                            className={`p-1 ${
                                                                isCurrentUser
                                                                    ? ''
                                                                    : 'bg-opacity-20 bg-gray-500 rounded-md'
                                                            }`}
                                                        >
                                                            {' '}
                                                            {/* Slightly different bg for non-user files */}
                                                            <div className="flex items-center">
                                                                {icon}
                                                                <div className="flex-grow overflow-hidden">
                                                                    <p
                                                                        className="text-sm font-medium truncate"
                                                                        title={
                                                                            msg.fileName ||
                                                                            'Attached file'
                                                                        }
                                                                    >
                                                                        {msg.fileName ||
                                                                            'Attached File'}
                                                                    </p>
                                                                    {msg.fileSize && (
                                                                        <p className="text-xs opacity-80">
                                                                            {(
                                                                                msg.fileSize /
                                                                                1024
                                                                            ).toFixed(
                                                                                1
                                                                            )}{' '}
                                                                            KB
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={
                                                                    fullFileUrl
                                                                }
                                                                target="_blank"
                                                                download={
                                                                    msg.fileName ||
                                                                    'download'
                                                                }
                                                                className={`mt-2 inline-block text-xs px-3 py-1 rounded-full transition-colors
                                                                          ${
                                                                              isCurrentUser
                                                                                  ? 'bg-blue-400 hover:bg-blue-300 text-white'
                                                                                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                                                                          }`}
                                                                aria-label={`Download ${
                                                                    msg.fileName ||
                                                                    (isPdf
                                                                        ? 'PDF document'
                                                                        : 'file')
                                                                }`}
                                                            >
                                                                Download{' '}
                                                                {isPdf
                                                                    ? 'PDF'
                                                                    : 'File'}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <p>
                                                            {caption ||
                                                                msg.content}
                                                        </p>
                                                    );
                                                    icon = null; // Icon is part of the content block for 'file' type
                                                    break;
                                                default: // text
                                                    content = (
                                                        <p>{msg.content}</p>
                                                    );
                                                    break;
                                            }

                                            return (
                                                <div className="flex flex-col">
                                                    {icon &&
                                                        msg.type !==
                                                            'file' && // Display icon for non-file types if caption or content exists
                                                        (caption ||
                                                            msg.type ===
                                                                'audio' ||
                                                            msg.type ===
                                                                'image' ||
                                                            msg.type ===
                                                                'video') && (
                                                            <div className="flex items-center mb-1 text-xs opacity-75">
                                                                {icon}
                                                                <span className="ml-1 truncate">
                                                                    {msg.fileName ||
                                                                        (msg.type
                                                                            ? msg.type
                                                                                  .charAt(
                                                                                      0
                                                                                  )
                                                                                  .toUpperCase() +
                                                                              msg.type.slice(
                                                                                  1
                                                                              )
                                                                            : 'Media')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {content}
                                                    {renderCaption(caption)}
                                                </div>
                                            );
                                        })()}
                                        <p
                                            className={`text-xs mt-1 ${
                                                isCurrentUser
                                                    ? 'text-blue-100 opacity-80'
                                                    : 'text-gray-500 opacity-80'
                                            }`}
                                        >
                                            {formatTime(
                                                msg.createdAt as unknown as string
                                            )}{' '}
                                            {msg.status === 'Pending' &&
                                                msg.uploadProgress !==
                                                    undefined &&
                                                msg.uploadProgress < 100 &&
                                                `(Uploading ${msg.uploadProgress}%)`}
                                            {msg.status === 'Pending' &&
                                                (msg.uploadProgress ===
                                                    undefined ||
                                                    msg.uploadProgress ===
                                                        100) &&
                                                '(Processing...)'}
                                            {msg.status === 'Failed' &&
                                                '(Failed)'}
                                            {msg.id?.startsWith('temp-') &&
                                                msg.status !== 'Pending' &&
                                                msg.status !== 'Failed' &&
                                                '(Sending...)'}
                                        </p>
                                        {msg.status === 'Failed' &&
                                            isCurrentUser && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 h-auto text-xs text-red-400 hover:text-red-300 mt-1"
                                                    onClick={() => {
                                                        // Resend logic: Need to pass the original file/text back to onSendMessage
                                                        // This is a simplified retry that just re-triggers onSendMessage
                                                        // A more robust solution would store the File object or allow re-selection
                                                        if (
                                                            msg.type !==
                                                                'text' &&
                                                            msg.fileName &&
                                                            msg.fileMimeType &&
                                                            msg.fileUrl?.startsWith(
                                                                'blob:'
                                                            )
                                                        ) {
                                                            // Attempt to refetch blob for retry if possible, or prompt user
                                                            // For simplicity, this example won't try to refetch blob.
                                                            // Consider how to handle retrying file uploads: store File object in memory?
                                                            console.warn(
                                                                'Retry for failed file uploads needs more robust File handling.'
                                                            );
                                                            // onSendMessage(msg.originalMessage || msg.message || '', /* Need File object here */, msg.type);
                                                        } else if (
                                                            msg.type ===
                                                            'text'
                                                        ) {
                                                            onSendMessage(
                                                                msg.content
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                        {msg.status === 'Pending' &&
                                            msg.uploadProgress !== undefined &&
                                            msg.uploadProgress < 100 &&
                                            isCurrentUser && (
                                                <div className="mt-1 h-1 w-full bg-gray-300 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-300 h-1 rounded-full"
                                                        style={{
                                                            width: `${msg.uploadProgress}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            )}
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
                {audioBlob && !isRecording ? (
                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md mb-2">
                        <div className="flex items-center space-x-2">
                            <audio
                                controls
                                src={URL.createObjectURL(audioBlob)}
                                className="h-10"
                            ></audio>
                            <span className="text-sm text-gray-700">
                                Voice note ready
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={handleDiscardAudio}
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                            <Button
                                onClick={handleSendAudio}
                                size="icon"
                                variant="ghost"
                                className="text-blue-500 hover:text-blue-700"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                ) : isRecording ? (
                    <div className="flex items-center justify-center p-2 text-red-500 mb-2">
                        <StopCircle className="h-5 w-5 mr-2 animate-pulse" />
                        <span>
                            Recording: {formatRecordingTime(recordingTime)}
                        </span>
                    </div>
                ) : selectedFile ? (
                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md mb-2">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            {filePreviewUrl &&
                                selectedFile?.type.startsWith('image/') && (
                                    <img
                                        src={filePreviewUrl}
                                        alt="Preview"
                                        className="h-10 w-10 object-cover rounded"
                                    />
                                )}
                            {filePreviewUrl &&
                                selectedFile?.type.startsWith('video/') && (
                                    <video
                                        src={filePreviewUrl}
                                        className="h-10 w-10 object-cover rounded"
                                    />
                                )}
                            {(!filePreviewUrl ||
                                (!selectedFile?.type.startsWith('image/') &&
                                    !selectedFile?.type.startsWith(
                                        'video/'
                                    ))) &&
                                selectedFile && (
                                    <Paperclip className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                )}
                            <span
                                className="text-sm text-gray-700 truncate"
                                title={selectedFile.name}
                            >
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-gray-500">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={handleDiscardFile}
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                aria-label="Discard selected file"
                            >
                                <XCircle className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                ) : null}

                <form
                    onSubmit={handleSend}
                    className="flex space-x-2 items-center"
                >
                    <Button
                        type="button"
                        onClick={handleAttachmentClick}
                        size="icon"
                        variant="outline"
                        disabled={isRecording || !!audioBlob}
                        aria-label="Attach file"
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={ALLOWED_FILE_TYPES}
                        hidden
                        aria-hidden="true" // Hidden inputs should be marked as such for accessibility
                    />
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                            isRecording
                                ? 'Recording audio...'
                                : audioBlob
                                ? 'Audio ready, add a caption or send'
                                : selectedFile
                                ? `Caption for ${selectedFile.name}`
                                : 'Type a message...'
                        }
                        className="flex-1"
                        disabled={isRecording && !audioBlob}
                        aria-label="Message input"
                    />
                    <Button
                        type="button"
                        onClick={handleRecordButtonClick}
                        size="icon"
                        variant={isRecording ? 'destructive' : 'outline'}
                        disabled={!!selectedFile}
                        aria-label={
                            isRecording
                                ? 'Stop recording'
                                : 'Record voice message'
                        }
                    >
                        {isRecording ? (
                            <StopCircle className="h-5 w-5" />
                        ) : (
                            <Mic className="h-5 w-5" />
                        )}
                    </Button>
                    <Button
                        type="submit"
                        size="icon"
                        disabled={
                            (isRecording && !audioBlob) ||
                            (!selectedFile && !audioBlob && !inputValue.trim())
                        }
                        aria-label="Send message"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
