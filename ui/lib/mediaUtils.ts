import { WEBRTC_CONFIG } from '@/lib/constants';

interface GetMediaConfig {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

export const getLocalMedia = async (config: GetMediaConfig): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia(config);
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw new Error(`Failed to access media devices: ${(error as Error).message}`);
  }
};

export const getDisplayMedia = async (): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
  } catch (error) {
    console.error('Error accessing screen share:', error);
    throw new Error(`Failed to start screen sharing: ${(error as Error).message}`);
  }
};

export const stopMediaStream = (stream: MediaStream | null) => {
  if (!stream) return;
  stream.getTracks().forEach(track => {
    track.stop();
    stream.removeTrack(track);
  });
};

export const replaceAudioTrack = (oldStream: MediaStream, newTrack: MediaTrackConstraints): Promise<MediaStream> => {
  return replaceTrack(oldStream, { audio: newTrack });
};

export const replaceVideoTrack = (oldStream: MediaStream, newTrack: MediaTrackConstraints): Promise<MediaStream> => {
  return replaceTrack(oldStream, { video: newTrack });
};

const replaceTrack = async (oldStream: MediaStream, constraints: GetMediaConfig): Promise<MediaStream> => {
  const newStream = await getLocalMedia(constraints);
  const newTrack = newStream.getTracks()[0];
  const oldTrack = oldStream.getTracks().find(track => track.kind === newTrack.kind);
  
  if (oldTrack) {
    oldTrack.stop();
    oldStream.removeTrack(oldTrack);
  }
  
  oldStream.addTrack(newTrack);
  return oldStream;
};

interface AudioAnalyzer {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  stop: () => void;
}

export const createAudioAnalyzer = (stream: MediaStream): AudioAnalyzer | null => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  
  analyser.fftSize = 256;
  source.connect(analyser);
  
  return {
    analyser,
    dataArray: new Uint8Array(analyser.frequencyBinCount),
    stop: () => {
      source.disconnect();
      audioContext.close();
    }
  };
};

export const getDevices = async (): Promise<{
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputs: devices.filter(device => device.kind === 'audioinput'),
      videoInputs: devices.filter(device => device.kind === 'videoinput'),
      audioOutputs: devices.filter(device => device.kind === 'audiooutput')
    };
  } catch (error) {
    console.error('Error enumerating devices:', error);
    throw new Error(`Failed to get media devices: ${(error as Error).message}`);
  }
};
