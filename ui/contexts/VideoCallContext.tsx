import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { WebRTCClient, ProducerInfo as WebRTCProducerInfo, ConsumerInfo as WebRTCConsumerInfo } from '@/lib/webrtcClient'; // Adjust path
import {
  emitJoinRoom,
  emitLeaveRoom,
  onNewProducer,
  onProducerClosed,
  onUserJoinedRoom,
  onUserLeftRoom,
  onActiveProducers,
  // Assuming socket is managed or accessible, e.g. via getSocket()
  // If not, socket instance needs to be passed or handled here.
} from '@/lib/socket'; // Adjust path
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'; // For typing if needed directly

// --- State Shape ---
export interface Participant {
  id: string; // userId
  name?: string;
  isLocal?: boolean;
  audioEnabled?: boolean; // Reflects actual track state for webcam/mic
  videoEnabled?: boolean; // Reflects actual track state for webcam
  socketId?: string;
  stream?: MediaStream; // Combined stream for webcam video and audio for display in ParticipantTile
  screenStream?: MediaStream; // Separate stream for screen share
  audioProducerId?: string;
  videoProducerId?: string;
  screenShareProducerId?: string; // Local user's own screen share producer ID
  isScreenSharing?: boolean; // Is this participant sharing their screen (for remote participants)
}

// RemoteStream might become redundant if Participant.stream holds the combined stream
// and remoteMediaStreams holds individual tracks/consumers.
export interface RemoteStreamInfo { // Renamed from RemoteStream to avoid confusion with MediaStream
  id: string; // consumerId (or producerId if that's how you map before consuming)
  stream: MediaStream; // The actual MediaStream object with one track
  participantId: string; // userId of the participant owning this stream
  kind: 'audio' | 'video';
  consumerId: string; // Mediasoup consumerId
}

interface VideoCallState {
  roomId: string | null;
  isInCall: boolean;
  isConnecting: boolean;
  error: string | null;
    
  // Store remote streams directly with their unique IDs (e.g., producerId)
  localStream: MediaStream | null; // Webcam/mic stream
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  localScreenStream: MediaStream | null; // Local user's screen share stream
  isScreenSharing: boolean; // Is the local user currently sharing their screen
  screenShareProducerId: string | null; // Producer ID for the local screen share
  
  remoteConsumers: Map<string, WebRTCConsumerInfo>; // producerId -> WebRTCConsumerInfo
  participants: Map<string, Participant>;
  activeSpeakerId: string | null;
}

// --- Context Actions ---
interface VideoCallActions {
  initiateCall: (roomId: string, localUserId: string, localUserName?: string) => Promise<void>;
  leaveCall: () => Promise<void>;
  
  startLocalMedia: (audio?: boolean, video?: boolean) => Promise<MediaStream | null>;
  stopLocalMedia: () => void;

  toggleLocalAudio: () => Promise<void>;
  toggleLocalVideo: () => Promise<void>;

  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  
  _handleNewProducer: (payload: { producerId: string; userId: string; kind: 'audio' | 'video'; appData?: { type?: 'webcam' | 'screen', [key: string]: any }, socketId: string }) => void;
  _handleProducerClosed: (payload: { producerId: string; userId: string, socketId: string }) => void;
  _handleUserJoined: (payload: { userId: string; socketId: string; name?: string }) => void;
  _handleUserLeft: (payload: { userId: string; socketId: string }) => void;
  _handleActiveProducers: (producers: { producerId: string, kind: 'audio' | 'video', userId: string, appData?: { type?: 'webcam' | 'screen', [key: string]: any } }[]) => void;

  updateParticipantMediaState: (participantId: string, kind: 'audio' | 'video' | 'screen', enabled: boolean, producerId?: string) => void;
  
  setActiveSpeaker: (participantId: string | null) => void;

  _mockAddParticipant: (participant: Participant) => void;
  _mockRemoveParticipant: (participantId: string) => void;
  _mockToggleParticipantVideo: (participantId: string) => void;
  _mockToggleParticipantAudio: (participantId: string) => void;
  _mockToggleScreenShare: (participantId: string, isSharing: boolean) => void; // For testing UI of remote screen share
}

const VideoCallContext = createContext<VideoCallState & VideoCallActions | undefined>(undefined);

interface VideoCallProviderProps {
  children: ReactNode;
}

export const VideoCallProvider: React.FC<VideoCallProviderProps> = ({ children }) => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null); // Store local user ID
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [localScreenStream, setLocalScreenStreamState] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharingState] = useState(false);
  const [screenShareProducerId, setScreenShareProducerIdState] = useState<string | null>(null);
  
  const [remoteConsumers, setRemoteConsumers] = useState<Map<string, WebRTCConsumerInfo>>(new Map());
  const [participants, setParticipantsState] = useState<Map<string, Participant>>(new Map());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const webrtcClientRef = useRef<WebRTCClient | null>(null);

  useEffect(() => {
    if (!webrtcClientRef.current) {
      webrtcClientRef.current = new WebRTCClient();
    }
  }, []);

  const setCallStatus = useCallback((status: Partial<Pick<VideoCallState, 'isInCall' | 'isConnecting' | 'error'>>) => {
    if (status.isInCall !== undefined) setIsInCall(status.isInCall);
    if (status.isConnecting !== undefined) setIsConnecting(status.isConnecting);
    if (status.error !== undefined) setError(status.error);
  }, []);

  const updateParticipant = useCallback((participantId: string, updates: Partial<Participant>) => {
    setParticipantsState(prev => {
      const existingParticipant = prev.get(participantId);
      if (existingParticipant) {
        return new Map(prev).set(participantId, { ...existingParticipant, ...updates });
      }
      if (updates.id && (updates.name || updates.socketId || updates.isLocal)) { // Ensure enough info to create
         return new Map(prev).set(participantId, updates as Participant);
      }
      return prev;
    });
  }, []);

  const startLocalMedia = useCallback(async (audio = true, video = true): Promise<MediaStream | null> => {
    console.log('Requesting local media with audio:', audio, 'video:', video);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audio ? { noiseSuppression: true, echoCancellation: true } : false, 
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      setLocalStreamState(stream);
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      const currentAudioEnabled = !!(audioTrack && audioTrack.enabled);
      const currentVideoEnabled = !!(videoTrack && videoTrack.enabled);
      setLocalAudioEnabled(currentAudioEnabled);
      setLocalVideoEnabled(currentVideoEnabled);
      
      if (localUserId) {
        updateParticipant(localUserId, { 
          stream, 
          audioEnabled: currentAudioEnabled, 
          videoEnabled: currentVideoEnabled 
        });
      }
      console.log('Local media obtained:', stream);
      return stream;
    } catch (err) {
      console.error('Error getting user media:', err);
      setError((err as Error).message || 'Failed to get user media. Check permissions and devices.');
      setLocalAudioEnabled(false);
      setLocalVideoEnabled(false);
      return null;
    }
  }, [localUserId, updateParticipant]);

  const stopLocalMedia = useCallback(() => {
    console.log('Stopping local media (webcam/mic)');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStreamState(null);
    setLocalAudioEnabled(false);
    setLocalVideoEnabled(false);
    if (localUserId) {
      updateParticipant(localUserId, { stream: undefined, audioEnabled: false, videoEnabled: false, audioProducerId: undefined, videoProducerId: undefined });
      webrtcClientRef.current?.closeProducer('audio'); // Assumes 'audio' is key for mic producer
      webrtcClientRef.current?.closeProducer('video'); // Assumes 'video' is key for cam producer
    }
  }, [localStream, localUserId, updateParticipant]);

  const addParticipant = useCallback((participant: Participant) => {
    setParticipantsState(prev => new Map(prev).set(participant.id, { ...prev.get(participant.id), ...participant }));
  }, []);

  const removeParticipant = useCallback((participantId: string) => {
    setParticipantsState(prev => {
      const newParticipants = new Map(prev);
      newParticipants.delete(participantId);
      return newParticipants;
    });
  }, []);

  const _addOrUpdateParticipantStream = useCallback((participantId: string, newTrack: MediaStreamTrack, streamType: 'webcam' | 'screen' = 'webcam') => {
    setParticipantsState(prev => {
        const participant = prev.get(participantId);
        if (!participant) return prev;

        let targetStreamKey: 'stream' | 'screenStream' = streamType === 'screen' ? 'screenStream' : 'stream';
        let newStream = participant[targetStreamKey] || new MediaStream();
        
        // Ensure only one track of this kind in this specific stream
        const oldTracks = newStream.getTracks().filter(t => t.kind === newTrack.kind);
        oldTracks.forEach(t => {
            if (t.id !== newTrack.id) {
                newStream.removeTrack(t);
                t.stop();
            }
        });
        
        if (!newStream.getTrackById(newTrack.id)) {
            newStream.addTrack(newTrack);
        }
        
        const updatedParticipant = { ...participant, [targetStreamKey]: newStream };

        if (streamType === 'webcam') {
            updatedParticipant.audioEnabled = newStream.getAudioTracks().some(t => t.enabled);
            updatedParticipant.videoEnabled = newStream.getVideoTracks().some(t => t.enabled);
        } else { // screen share
            updatedParticipant.isScreenSharing = newStream.getVideoTracks().some(t => t.enabled); // Assuming screen share is video only
        }

        return new Map(prev).set(participantId, updatedParticipant);
    });
  }, []);

  const _removeParticipantTrack = useCallback((participantId: string, kind: 'audio' | 'video', streamType: 'webcam' | 'screen' = 'webcam') => {
      setParticipantsState(prev => {
          const participant = prev.get(participantId);
          if (!participant) return prev;

          let targetStreamKey: 'stream' | 'screenStream' = streamType === 'screen' ? 'screenStream' : 'stream';
          const currentStream = participant[targetStreamKey];
          if (!currentStream) return prev;
          
          const tracks = kind === 'audio' ? currentStream.getAudioTracks() : currentStream.getVideoTracks();
          tracks.forEach(t => {
              currentStream.removeTrack(t);
              t.stop();
          });

          const updatedParticipant = { ...participant };
          const hasTracksLeft = currentStream.getTracks().length > 0;
          
          if (streamType === 'webcam') {
              updatedParticipant.audioEnabled = currentStream.getAudioTracks().some(t => t.enabled);
              updatedParticipant.videoEnabled = currentStream.getVideoTracks().some(t => t.enabled);
              if (!hasTracksLeft) updatedParticipant.stream = undefined;
          } else { // screen share
              updatedParticipant.isScreenSharing = currentStream.getVideoTracks().some(t => t.enabled);
              if (!hasTracksLeft) updatedParticipant.screenStream = undefined;
          }
          
          return new Map(prev).set(participantId, updatedParticipant);
      });
  }, []);


  const initiateCall = useCallback(async (rId: string, currentLocalUserId: string, localUserName?: string) => {
    // ... (rest of initiateCall logic remains largely the same)
    // Ensure addParticipant is called with correct localUserId and name
    if (isInCall || isConnecting) {
      console.warn('Call already in progress or connecting.');
      return;
    }
    console.log(`Initiating call for room ${rId}, user ${currentLocalUserId}`);
    setRoomId(rId);
    setLocalUserId(currentLocalUserId); // Set localUserId here
    setIsConnecting(true);
    setError(null);

    addParticipant({
      id: currentLocalUserId,
      name: localUserName || 'You',
      isLocal: true,
      audioEnabled: localAudioEnabled,
      videoEnabled: localVideoEnabled,
      stream: localStream,
      isScreenSharing: false, // Initialize screen sharing state
    });

    const stream = await startLocalMedia();
    if (!stream) {
      console.error('Failed to start local media, aborting call initiation.');
      setIsConnecting(false);
      setError('Could not start microphone/camera. Please check permissions.');
      setRoomId(null);
      setLocalUserId(null);
      removeParticipant(currentLocalUserId);
      return;
    }
    
    updateParticipant(currentLocalUserId, { stream, audioEnabled: stream.getAudioTracks()[0]?.enabled, videoEnabled: stream.getVideoTracks()[0]?.enabled });

    emitJoinRoom({ roomId: rId }, async (joinResponse) => {
      if (joinResponse.error) {
        console.error('Failed to join room:', joinResponse.error);
        setError(joinResponse.error);
        setIsConnecting(false);
        stopLocalMedia();
        removeParticipant(currentLocalUserId);
        setRoomId(null);
        setLocalUserId(null);
        return;
      }
      
      console.log('Successfully joined room. Active producers:', joinResponse.activeProducers);
      setIsInCall(true);
      setIsConnecting(false);

      try {
        if (!webrtcClientRef.current) throw new Error("WebRTCClient not initialized");
        
        await webrtcClientRef.current.loadDevice(rId);
        await webrtcClientRef.current.createSendTransport();
        await webrtcClientRef.current.createRecvTransport();
        console.log('Send and Recv transports created.');

        const audioTrack = stream.getAudioTracks()[0];
        if (localAudioEnabled && audioTrack) {
          try {
            const audioProducer = await webrtcClientRef.current.produce(audioTrack, { userId: currentLocalUserId, type: 'webcam' }); // Specify type
            updateParticipant(currentLocalUserId, { audioProducerId: audioProducer.id });
            console.log('Audio produced:', audioProducer.id);
          } catch (prodError) { console.error('Error producing audio:', prodError); setError('Error producing audio: ' + (prodError as Error).message); }
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (localVideoEnabled && videoTrack) {
           try {
            const videoProducer = await webrtcClientRef.current.produce(videoTrack, { userId: currentLocalUserId, type: 'webcam' }); // Specify type
            updateParticipant(currentLocalUserId, { videoProducerId: videoProducer.id });
            console.log('Video produced:', videoProducer.id);
          } catch (prodError) { console.error('Error producing video:', prodError); setError('Error producing video: ' + (prodError as Error).message); }
        }
        
        if (joinResponse.activeProducers) {
           _handleActiveProducers(joinResponse.activeProducers);
        }

      } catch (webRtcErr) {
        console.error('WebRTC setup failed after joining room:', webRtcErr);
        setError((webRtcErr as Error).message || 'WebRTC setup failed.');
        emitLeaveRoom({ roomId: rId }); 
        stopLocalMedia();
        setIsInCall(false);
        setIsConnecting(false);
        webrtcClientRef.current?.close();
        removeParticipant(currentLocalUserId);
        setRoomId(null);
        setLocalUserId(null);
      }
    });
  }, [isInCall, isConnecting, startLocalMedia, stopLocalMedia, localAudioEnabled, localVideoEnabled, localStream, addParticipant, updateParticipant, removeParticipant]);

  const leaveCall = useCallback(async () => {
    console.log('Leaving call for room:', roomId);
    if (!roomId) return;
    emitLeaveRoom({ roomId });
    
    stopLocalMedia(); // Stops webcam/mic
    if (isScreenSharing) { // Also stop screen share if active
        await stopScreenShare(); // Call the new stopScreenShare function
    }

    webrtcClientRef.current?.close();
    setIsInCall(false);
    setIsConnecting(false);
    setRoomId(null);
    setLocalUserId(null); // Clear localUserId
    setError(null);
    setParticipantsState(new Map());
    setRemoteConsumers(new Map());
    console.log('Call left and resources cleaned up.');
  }, [roomId, stopLocalMedia, isScreenSharing]); // Added isScreenSharing to dependencies

  const toggleLocalAudio = useCallback(async () => {
    // ... (logic for toggling webcam audio, ensure appData type: 'webcam')
    if (!localStream || !localUserId) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    const newEnabledState = !audioTrack.enabled;
    audioTrack.enabled = newEnabledState;
    setLocalAudioEnabled(newEnabledState);
    updateParticipant(localUserId, { audioEnabled: newEnabledState });

    if (webrtcClientRef.current) {
        const participant = participants.get(localUserId);
        if (newEnabledState && !participant?.audioProducerId) {
            try {
                const producer = await webrtcClientRef.current.produce(audioTrack, { userId: localUserId, type: 'webcam' });
                updateParticipant(localUserId, { audioProducerId: producer.id });
            } catch (e) { console.error("Failed to produce audio on unmute:", e); audioTrack.enabled = false; setLocalAudioEnabled(false); updateParticipant(localUserId, { audioEnabled: false });}
        } else if (!newEnabledState && participant?.audioProducerId) {
             webrtcClientRef.current.pauseProducer('audio'); // Assuming 'audio' is the key for webcam audio producer
        } else if (newEnabledState && participant?.audioProducerId) {
            webrtcClientRef.current.resumeProducer('audio');
        }
    }
    console.log('Local audio (webcam) toggled to:', newEnabledState);
  }, [localStream, localUserId, participants, updateParticipant]);

  const toggleLocalVideo = useCallback(async () => {
    // ... (logic for toggling webcam video, ensure appData type: 'webcam')
    if (!localStream || !localUserId) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const newEnabledState = !videoTrack.enabled;
    videoTrack.enabled = newEnabledState;
    setLocalVideoEnabled(newEnabledState);
    updateParticipant(localUserId, { videoEnabled: newEnabledState });

    if (webrtcClientRef.current) {
        const participant = participants.get(localUserId);
        if (newEnabledState && !participant?.videoProducerId) {
             try {
                const producer = await webrtcClientRef.current.produce(videoTrack, { userId: localUserId, type: 'webcam' });
                updateParticipant(localUserId, { videoProducerId: producer.id });
            } catch (e) { console.error("Failed to produce video on unmute:", e); videoTrack.enabled = false; setLocalVideoEnabled(false); updateParticipant(localUserId, { videoEnabled: false });}
        } else if (!newEnabledState && participant?.videoProducerId) {
            webrtcClientRef.current.pauseProducer('video'); // Assuming 'video' is key for webcam video producer
        } else if (newEnabledState && participant?.videoProducerId) {
             webrtcClientRef.current.resumeProducer('video');
        }
    }
    console.log('Local video (webcam) toggled to:', newEnabledState);
  }, [localStream, localUserId, participants, updateParticipant]);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing || !roomId || !localUserId || !webrtcClientRef.current?.getSendTransportId()) {
      console.warn('Cannot start screen share:', { isScreenSharing, roomId, localUserId, transportExists: !!webrtcClientRef.current?.getSendTransportId() });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setLocalScreenStreamState(stream);
      setIsScreenSharingState(true);

      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("No video track found in display media stream");

      // Handle user stopping screen share from browser UI
      track.onended = () => {
        console.log('Screen share track ended by user (browser UI)');
        stopScreenShare(); // Call our internal stop function
      };
      
      const transportId = webrtcClientRef.current.getSendTransportId(); // Need a method in WebRTCClient to get this
      if(!transportId) throw new Error("Send transport not available for screen share");

      const producerId = await webrtcClientRef.current.produceScreenShare({ 
        track, 
        appData: { type: 'screen', userId: localUserId } 
      });
      setScreenShareProducerIdState(producerId);
      updateParticipant(localUserId, { screenShareProducerId: producerId, isScreenSharing: true, screenStream: stream });

      console.log('Screen share started, producerId:', producerId);
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError((err as Error).message || 'Failed to start screen share.');
      setLocalScreenStreamState(null);
      setIsScreenSharingState(false);
    }
  }, [isScreenSharing, roomId, localUserId, updateParticipant]);

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing || !localScreenStream || !screenShareProducerId || !roomId) {
      console.warn('Not currently screen sharing or missing info.');
      return;
    }
    console.log('Stopping screen share, producerId:', screenShareProducerId);
    localScreenStream.getTracks().forEach(track => track.stop());
    
    try {
      await webrtcClientRef.current?.closeScreenShareProducer(screenShareProducerId, roomId);
    } catch (err) {
        console.error("Error signaling stopScreenShare to server:", err);
        // Continue cleanup even if signaling fails for some reason
    }

    setLocalScreenStreamState(null);
    setIsScreenSharingState(false);
    if (localUserId) {
      updateParticipant(localUserId, { screenShareProducerId: null, isScreenSharing: false, screenStream: undefined });
    }
    setScreenShareProducerIdState(null);
    console.log('Screen share stopped.');
  }, [isScreenSharing, localScreenStream, screenShareProducerId, roomId, localUserId, updateParticipant]);


  const _handleNewProducer = useCallback(async (payload: { producerId: string; userId: string; kind: 'audio' | 'video'; appData?: { type?: 'webcam' | 'screen', [key: string]: any }, socketId: string }) => {
    // ... (existing logic, now needs to differentiate based on appData.type)
    if (!webrtcClientRef.current || !webrtcClientRef.current.isInitialized() || !isInCall) {
      console.warn('Received newProducer but WebRTC client not ready or not in call.', payload); return;
    }
    if (payload.userId === localUserId) { console.log("Ignoring own newProducer event", payload); return; }

    console.log('Handling new producer from signaling:', payload);
    const { producerId, userId, kind, appData, socketId } = payload;
    const producerType = appData?.type || 'webcam'; // Default to webcam if type not specified

    if (!participants.has(userId)) {
        addParticipant({ id: userId, name: appData?.name || `User ${userId.substring(0,6)}`, socketId, audioEnabled: false, videoEnabled: false, isScreenSharing: false });
    }
    if (remoteConsumers.has(producerId)) { console.warn(`Already consuming producer ${producerId}. Ignoring.`); return; }

    try {
      const rtpCapabilities = webrtcClientRef.current.getDeviceRtpCapabilities();
      if (!rtpCapabilities) { console.error("Device RTP capabilities are not available. Cannot consume."); setError("Device RTP capabilities are not available for consumption."); return; }
      
      const consumerInfo = await webrtcClientRef.current.consume(producerId, kind, rtpCapabilities, appData);
      if (consumerInfo) {
        setRemoteConsumers(prev => new Map(prev).set(producerId, consumerInfo)); // Store consumer by producerId
        
        if (producerType === 'screen') {
            _addOrUpdateParticipantStream(userId, consumerInfo.track, 'screen');
            updateParticipant(userId, { isScreenSharing: true });
        } else { // webcam or audio
            _addOrUpdateParticipantStream(userId, consumerInfo.track, 'webcam');
            if (kind === 'audio') updateParticipant(userId, { audioEnabled: true });
            if (kind === 'video') updateParticipant(userId, { videoEnabled: true });
        }
        console.log(`Successfully consumed ${kind} (type: ${producerType}) from ${userId}, producer ${producerId}`);
      }
    } catch (err) {
      console.error(`Error consuming producer ${producerId} (${kind}, type: ${producerType}) from ${userId}:`, err);
      setError(`Failed to consume ${kind} from ${userId}: ${(err as Error).message}`);
    }
  }, [isInCall, localUserId, participants, remoteConsumers, addParticipant, updateParticipant, _addOrUpdateParticipantStream]);

  const _handleProducerClosed = useCallback((payload: { producerId: string; userId: string, socketId: string }) => {
    console.log('Handling producer closed from signaling:', payload);
    const { producerId, userId } = payload;
    const consumerInfo = remoteConsumers.get(producerId); // Get consumer by producerId
    if (consumerInfo) {
      webrtcClientRef.current?.closeConsumer(consumerInfo.id);
      setRemoteConsumers(prev => { const newConsumers = new Map(prev); newConsumers.delete(producerId); return newConsumers; });
      
      const producerType = consumerInfo.appData?.type || 'webcam';
      _removeParticipantTrack(userId, consumerInfo.kind, producerType as 'webcam' | 'screen');

      if (producerType === 'screen') {
          updateParticipant(userId, { isScreenSharing: false, screenStream: undefined });
      } else {
          if (consumerInfo.kind === 'audio') updateParticipant(userId, { audioEnabled: false });
          if (consumerInfo.kind === 'video') updateParticipant(userId, { videoEnabled: false });
      }
      console.log(`Consumer for producer ${producerId} (type: ${producerType}) closed and track removed for user ${userId}`);
    }
  }, [remoteConsumers, _removeParticipantTrack, updateParticipant]);

  const _handleUserJoined = useCallback((payload: { userId: string; socketId: string, name?: string }) => {
    console.log('User joined room:', payload);
    if (payload.userId === localUserId) return;
    addParticipant({ 
        id: payload.userId, 
        name: payload.name || `User ${payload.userId.substring(0,6)}`, 
        socketId: payload.socketId,
        audioEnabled: false, videoEnabled: false, isScreenSharing: false,
    });
  }, [localUserId, addParticipant]);

  const _handleUserLeft = useCallback((payload: { userId: string; socketId: string }) => {
    console.log('User left room:', payload);
    if (payload.userId === localUserId) return;
    removeParticipant(payload.userId);
  }, [localUserId, removeParticipant]);
  
  const _handleActiveProducers = useCallback((producersToConsume: { producerId: string, kind: 'audio' | 'video', userId: string, appData?: {type?: 'webcam' | 'screen'} }[]) => {
    console.log("Handling active producers list:", producersToConsume);
    producersToConsume.forEach(producerInfo => {
        if (producerInfo.userId !== localUserId) {
            _handleNewProducer({ ...producerInfo, socketId: '' }); // socketId might not be in this payload
        }
    });
  }, [localUserId, _handleNewProducer]);

  const updateParticipantMediaState = useCallback((participantId: string, kind: 'audio' | 'video' | 'screen', enabled: boolean, producerId?: string) => {
    const updates: Partial<Participant> = {};
    if (kind === 'audio') updates.audioEnabled = enabled;
    else if (kind === 'video') updates.videoEnabled = enabled;
    else if (kind === 'screen') updates.isScreenSharing = enabled;

    if (producerId) {
        if (kind === 'audio') updates.audioProducerId = enabled ? producerId : undefined;
        else if (kind === 'video') updates.videoProducerId = enabled ? producerId : undefined;
        else if (kind === 'screen') updates.screenShareProducerId = enabled ? producerId : undefined;
    }
    updateParticipant(participantId, updates);
  }, [updateParticipant]);

  useEffect(() => {
    const cleanupFunctions: (()=>void)[] = [];
    if(isInCall || isConnecting) {
        console.log("Setting up signaling event listeners for VideoCallContext");
        cleanupFunctions.push(onNewProducer(_handleNewProducer));
        cleanupFunctions.push(onProducerClosed(_handleProducerClosed));
        cleanupFunctions.push(onUserJoinedRoom(_handleUserJoined));
        cleanupFunctions.push(onUserLeftRoom(_handleUserLeft));
        cleanupFunctions.push(onActiveProducers(_handleActiveProducers));
    }
    return () => {
      console.log("Cleaning up signaling event listeners for VideoCallContext");
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [isInCall, isConnecting, _handleNewProducer, _handleProducerClosed, _handleUserJoined, _handleUserLeft, _handleActiveProducers]);

  const _mockAddParticipant = useCallback((p: Participant) => {
    const stream = new MediaStream(); 
    const pWithStream = { ...p, stream, audioEnabled: p.audioEnabled !== undefined ? p.audioEnabled : true, videoEnabled: p.videoEnabled !== undefined ? p.videoEnabled : true, isScreenSharing: p.isScreenSharing || false };
    addParticipant(pWithStream);
  }, [addParticipant]);
  const _mockRemoveParticipant = useCallback((participantId: string) => removeParticipant(participantId), [removeParticipant]);
  const _mockToggleParticipantVideo = useCallback((participantId: string) => {
     updateParticipant(participantId, { videoEnabled: !participants.get(participantId)?.videoEnabled });
  }, [participants, updateParticipant]);
  const _mockToggleParticipantAudio = useCallback((participantId: string) => {
     updateParticipant(participantId, { audioEnabled: !participants.get(participantId)?.audioEnabled });
  }, [participants, updateParticipant]);
   const _mockToggleScreenShare = useCallback((participantId: string, isSharing: boolean) => {
     updateParticipant(participantId, { isScreenSharing: isSharing, screenStream: isSharing ? new MediaStream() : undefined });
  }, [updateParticipant]);


  useEffect(() => {
    return () => {
      if (isInCall) { leaveCall(); }
      stopLocalMedia();
      if(isScreenSharing) { stopScreenShare(); } // Ensure screen share is also stopped
      webrtcClientRef.current?.close();
    };
  }, [isInCall, leaveCall, stopLocalMedia, isScreenSharing, stopScreenShare]);

  return (
    <VideoCallContext.Provider value={{
      roomId,
      isInCall,
      isConnecting,
      error,
      localStream, // webcam/mic
      localAudioEnabled,
      localVideoEnabled,
      localScreenStream, // screen share
      isScreenSharing,
      screenShareProducerId,
      remoteConsumers,
      participants,
      activeSpeakerId,
      initiateCall,
      leaveCall,
      startLocalMedia,
      stopLocalMedia,
      toggleLocalAudio,
      toggleLocalVideo,
      startScreenShare,
      stopScreenShare,
      _handleNewProducer,
      _handleProducerClosed,
      _handleUserJoined,
      _handleUserLeft,
      _handleActiveProducers,
      updateParticipantMediaState,
      setActiveSpeaker,
      _mockAddParticipant,
      _mockRemoveParticipant,
      _mockToggleParticipantVideo,
      _mockToggleParticipantAudio,
      _mockToggleScreenShare,
    }}>
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = (): VideoCallState & VideoCallActions => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};
