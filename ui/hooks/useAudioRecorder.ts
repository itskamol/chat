import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOutput {
  isRecording: boolean;
  audioBlob: Blob | null;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetAudioBlob: () => void; // To clear the blob after sending or discarding
}

const useAudioRecorder = (): UseAudioRecorderOutput => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetAudioBlob = useCallback(() => {
    setAudioBlob(null);
  }, []);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset previous state
      setAudioBlob(null);
      audioChunksRef.current = [];
      setRecordingTime(0);

      const options = { mimeType: 'audio/webm;codecs=opus' }; // Try to use webm with opus
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn("Failed to create MediaRecorder with audio/webm;codecs=opus, trying default options", e);
        try {
            // Fallback to default options, or try other common types
            recorder = new MediaRecorder(stream); 
        } catch (e2) {
            console.error("Failed to create MediaRecorder with any options:", e2);
            alert("Failed to start audio recording. Your browser might not support the required audio formats.");
            stream.getTracks().forEach(track => track.stop()); // Clean up the stream
            return;
        }
      }
      mediaRecorderRef.current = recorder;

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const completeBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        setAudioBlob(completeBlob);
        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop()); // Stop the stream tracks when recording stops
        console.log('Recording stopped, blob created:', completeBlob.type, completeBlob.size);
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        // @ts-ignore
        alert(`Recording error: ${event.error?.name} - ${event.error?.message}`);
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

      console.log('Recording started. MediaRecorder MIME type:', mediaRecorderRef.current.mimeType);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      // @ts-ignore
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please allow microphone access in your browser settings.');
      // @ts-ignore
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'){
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
    // The actual blob creation is handled in mediaRecorder.onstop
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

export default useAudioRecorder;
