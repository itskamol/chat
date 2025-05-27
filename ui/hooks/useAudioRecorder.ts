import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOutput {
    isRecording: boolean;
    audioBlob: Blob | null;
    recordingTime: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    resetAudioBlob: () => void;
}

export const useAudioRecorder = (): UseAudioRecorderOutput => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const resetAudioBlob = useCallback(() => {
        setAudioBlob(null);
    }, []);

    // Qo'llab-quvvatlanadigan audio formatlarni tekshirish
    const getSupportedMimeType = (): string => {
        const preferredTypes = [
            'audio/mpeg',        // MP3
            'audio/wav',         // WAV
            'audio/ogg',         // OGG
            'audio/webm;codecs=opus', // WebM with Opus
            'audio/webm',        // WebM fallback
        ];

        for (const type of preferredTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`Using audio format: ${type}`);
                return type;
            }
        }

        console.warn('No preferred audio format supported, using browser default');
        return '';
    };

    const startRecording = useCallback(async () => {
        if (isRecording) {
            console.warn('Recording is already in progress.');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia not supported on this browser!');
            alert('Audio recording is not supported on your browser.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                },
            });

            // Reset previous state
            setAudioBlob(null);
            audioChunksRef.current = [];
            setRecordingTime(0);

            // Qo'llab-quvvatlanadigan audio formatni olish
            const mimeType = getSupportedMimeType();
            
            let recorder: MediaRecorder;
            try {
                if (mimeType) {
                    recorder = new MediaRecorder(stream, { mimeType });
                } else {
                    recorder = new MediaRecorder(stream);
                }
            } catch (e) {
                console.error('Failed to create MediaRecorder:', e);
                alert('Failed to start audio recording. Your browser might not support the required audio formats.');
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            mediaRecorderRef.current = recorder;

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const actualMimeType = mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm';
                
                // Audio blob yaratish
                const completeBlob = new Blob(audioChunksRef.current, {
                    type: actualMimeType,
                });

                // Agar kerak bo'lsa, formatni o'zgartirish
                let finalBlob = completeBlob;
                let finalMimeType = actualMimeType;

                // Ruxsat etilgan formatlar ro'yxati
                const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
                
                if (!allowedTypes.some(type => actualMimeType.includes(type.split('/')[1]))) {
                    // Agar format ruxsat etilmagan bo'lsa, audio/mpeg ga o'zgartirish
                    finalMimeType = 'audio/mpeg';
                    finalBlob = new Blob(audioChunksRef.current, {
                        type: finalMimeType,
                    });
                    console.log(`Converted audio format from ${actualMimeType} to ${finalMimeType}`);
                }

                setAudioBlob(finalBlob);
                audioChunksRef.current = [];
                stream.getTracks().forEach((track) => track.stop());
                
                console.log('Recording stopped, blob created:', {
                    originalType: actualMimeType,
                    finalType: finalMimeType,
                    size: finalBlob.size
                });
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                // @ts-ignore
                alert(`Recording error: ${event.error?.name} - ${event.error?.message}`);
                setIsRecording(false);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorderRef.current.start(1000); // Har soniyada chunk yaratish
            setIsRecording(true);

            // Timer boshlash
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prevTime) => prevTime + 1);
            }, 1000);

            console.log('Recording started. MediaRecorder MIME type:', mediaRecorderRef.current.mimeType);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            // @ts-ignore
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert('Microphone permission denied. Please allow microphone access in your browser settings.');
            // @ts-ignore
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert('No microphone found. Please connect a microphone and try again.');
            } else {
                // @ts-ignore
                alert(`Error starting recording: ${err.message}`);
            }
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (!mediaRecorderRef.current || !isRecording) {
            console.warn('Recording is not in progress or recorder not initialized.');
            return;
        }
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    }, [isRecording]);

    return {
        isRecording,
        audioBlob,
        recordingTime,
        startRecording,
        stopRecording,
        resetAudioBlob,
    };
};