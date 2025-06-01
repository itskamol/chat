import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Mic, StopCircle, XCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { ALLOWED_FILE_TYPES } from '@/lib/constants';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    onSendFile: (file: File, caption?: string) => void;
    onSendAudio: (blob: Blob, caption?: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

export function MessageInput({
    onSendMessage,
    onSendFile,
    onSendAudio,
    isLoading,
    disabled,
}: MessageInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        isRecording,
        audioBlob,
        recordingTime,
        startRecording,
        stopRecording,
        resetAudioBlob,
    } = useAudioRecorder();

    const handleSend = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (audioBlob) {
                onSendAudio(audioBlob, inputValue);
                resetAudioBlob();
                setInputValue('');
                return;
            }

            if (selectedFile) {
                onSendFile(selectedFile, inputValue);
                setSelectedFile(null);
                setFilePreviewUrl(null);
                setInputValue('');
                return;
            }

            if (inputValue.trim()) {
                onSendMessage(inputValue.trim());
                setInputValue('');
            }
        },
        [
            audioBlob,
            selectedFile,
            inputValue,
            onSendMessage,
            onSendFile,
            onSendAudio,
            resetAudioBlob,
        ]
    );

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);

        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            setFilePreviewUrl(url);
        }
    };

    const handleDiscardFile = () => {
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
            setFilePreviewUrl(null);
        }
        setSelectedFile(null);
        setInputValue('');
    };

    const handleRecordButtonClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleDiscardAudio = () => {
        resetAudioBlob();
        setInputValue('');
    };

    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        setSelectedFile(file);
                        const url = URL.createObjectURL(file);
                        setFilePreviewUrl(url);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    return (
        <div className="p-4 bg-white border-t border-gray-200">
            {audioBlob && !isRecording ? (
                <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md mb-2">
                    <div className="flex items-center space-x-2">
                        <audio
                            controls
                            src={URL.createObjectURL(audioBlob)}
                            className="h-10"
                        />
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
                            aria-label="Discard voice note"
                        >
                            <XCircle className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={handleSend}
                            size="icon"
                            variant="ghost"
                            className="text-blue-500 hover:text-blue-700"
                            aria-label="Send voice note"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            ) : isRecording ? (
                <div className="flex items-center justify-center p-2 text-red-500 mb-2">
                    <StopCircle className="h-5 w-5 mr-2 animate-pulse" />
                    <span>Recording: {formatRecordingTime(recordingTime)}</span>
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
                                !selectedFile?.type.startsWith('video/'))) &&
                            selectedFile && (
                                <Paperclip className="h-5 w-5 text-gray-600 flex-shrink-0" />
                            )}
                        <span className="text-sm text-gray-700 truncate">
                            {selectedFile.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                    </div>
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
            ) : null}

            <form onSubmit={handleSend} className="flex space-x-2 items-center">
                <Button
                    type="button"
                    onClick={handleAttachmentClick}
                    size="icon"
                    variant="outline"
                    disabled={
                        isLoading || disabled || isRecording || !!audioBlob
                    }
                    aria-label="Attach file"
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={ALLOWED_FILE_TYPES.join(',')}
                    hidden
                    aria-hidden="true"
                />

                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                        isRecording
                            ? 'Recording audio...'
                            : audioBlob
                            ? 'Add a caption or send'
                            : selectedFile
                            ? `Caption for ${selectedFile.name}`
                            : 'Type a message...'
                    }
                    className="flex-1"
                    disabled={
                        isLoading || disabled || (isRecording && !audioBlob)
                    }
                    aria-label="Message input"
                />

                <Button
                    type="button"
                    onClick={handleRecordButtonClick}
                    size="icon"
                    variant={isRecording ? 'destructive' : 'outline'}
                    disabled={isLoading || disabled || !!selectedFile}
                    aria-label={
                        isRecording ? 'Stop recording' : 'Record voice message'
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
                        isLoading ||
                        disabled ||
                        (isRecording && !audioBlob) ||
                        (!selectedFile && !audioBlob && !inputValue.trim())
                    }
                    aria-label="Send message"
                >
                    <Send className="h-5 w-5" />
                </Button>
            </form>
        </div>
    );
}

function formatRecordingTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
