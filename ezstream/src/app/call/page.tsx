"use client"
import { useState, useRef, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import VideoCanvas from '../components/layout/videoCanvas';
import { Video, VideoOff } from 'lucide-react';

interface Participant {
  userId: string;
  streams: MediaStream[];
  isLocal: boolean;
}

export default function CallPage() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const streamingSocketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const iceCandidatesQueue = useRef<{ [key: string]: RTCIceCandidateInit[] }>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [activeRoom, setActiveRoom] = useState<string>('');

  const [selectedVideos, setSelectedVideos] = useState<HTMLVideoElement[]>([]);

  // Add these states at the top
  const [isStreaming, setIsStreaming] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Add at the top with other state
  const [initialJoin, setInitialJoin] = useState(true);

  // Add this state at the top with other states
  const [maxSelectedVideos, setMaxSelectedVideos] = useState(1);

  // Add these state variables at the top
  const [canvasWidth, setCanvasWidth] = useState(640);
  const [canvasHeight, setCanvasHeight] = useState(360);

  // Add this useEffect for handling resize
  useEffect(() => {
    const handleResize = () => {
      // First calculate based on 55vh height limit
      const maxHeight = window.innerHeight * 0.50; // 55vh
      const width = maxHeight * (16/9); // Calculate width based on height to maintain 16:9

      // If width is too wide for screen, recalculate based on width
      if (width > window.innerWidth - 32) {
        const adjustedWidth = window.innerWidth - 32;
        const adjustedHeight = adjustedWidth * (9/16);
        setCanvasWidth(adjustedWidth);
        setCanvasHeight(adjustedHeight);
      } else {
        setCanvasWidth(width);
        setCanvasHeight(maxHeight);
      }
    };

    // Set initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add function to generate random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  // Modify useEffect to auto-join on first load
  useEffect(() => {
    if (initialJoin) {
      const randomRoom = generateRoomId();
      setRoomId(randomRoom);
      joinRoom(randomRoom);
      setInitialJoin(false);
    }
  }, [initialJoin]);

  // Socket setup
  useEffect(() => {
    // Video calling socket
    socketRef.current = io('https://ezstream-callingserver.onrender.com', {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });
    
    // Streaming socket
    streamingSocketRef.current = io('https://ezstream-server.onrender.com', {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });
    
    // Video calling socket events
    socketRef.current.on('connect_error', (error) => {
      console.error('Video call socket error:', error);
    });

    socketRef.current.on('existing-users', (userIds: string[]) => {
      userIds.forEach(userId => {
        if (userId !== socketRef.current?.id && !peersRef.current[userId]) {
          const peer = createPeer(userId);
          peersRef.current[userId] = peer;
        }
      });
    });

    // Streaming socket events
    streamingSocketRef.current.on('connect_error', (error) => {
      console.error('Streaming socket error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
      streamingSocketRef.current?.disconnect();
    };
  }, []);

  // Join room and setup local stream
  const joinRoom = async (roomToJoin: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      
      setParticipants([{
        userId: 'local',
        streams: [stream],
        isLocal: true
      }]);
      
      setActiveRoom(roomToJoin);
      socketRef.current?.emit('join-room', roomToJoin);
      setJoined(true);
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  // WebRTC peer connection setup
  const createPeer = (userId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
  
    // Add this to process queued ICE candidates
    const queuedCandidates = iceCandidatesQueue.current[userId];
    if (queuedCandidates) {
      queuedCandidates.forEach(candidate => {
        peer.addIceCandidate(new RTCIceCandidate(candidate));
      });
      delete iceCandidatesQueue.current[userId];
    }
  
    // Modify the ice candidate handler to handle queuing properly
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        if (peer.remoteDescription) {
          // Send immediately if connection is established
          socketRef.current?.emit('ice-candidate', {
            candidate: event.candidate,
            to: userId,
          });
        } else {
          // Queue candidates until remote description is set
          iceCandidatesQueue.current[userId] = [
            ...(iceCandidatesQueue.current[userId] || []),
            event.candidate
          ];
        }
      }
    };

    // Update the track addition logic in createPeer
    const addTracksToPeer = (peer: RTCPeerConnection, stream: MediaStream | null) => {
      if (stream) {
        stream.getTracks().forEach(track => {
          if (!peer.getSenders().some(s => s.track === track)) {
            peer.addTrack(track, stream);
          }
        });
      }
    };

    // Replace existing track addition code with:
    addTracksToPeer(peer, localStreamRef.current);
    addTracksToPeer(peer, screenStreamRef.current);

    // Add this to handle track removal properly
    const removeTrackFromPeer = (peer: RTCPeerConnection, track: MediaStreamTrack) => {
      const sender = peer.getSenders().find(s => s.track === track);
      if (sender) {
        peer.removeTrack(sender);
      }
    };

    // Update the screen share stop logic
    screenStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      Object.values(peersRef.current).forEach(peer => {
        removeTrackFromPeer(peer, track);
      });
    });

    // Add renegotiation handler to peer connection
    peer.onnegotiationneeded = async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('offer', { offer, to: userId });
      } catch (err) {
        console.error('Negotiation failed:', err);
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        handleTrack(userId, stream);
      }
    };

    return peer;
  };

  // Socket event handlers
  useEffect(() => {
    if (!joined || !socketRef.current) return;

    socketRef.current.on('user-connected', async (userId: string) => {
      const peer = createPeer(userId);
      peersRef.current[userId] = peer;
      
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit('offer', { offer, to: userId });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    socketRef.current.on('user-disconnected', (userId: string) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
        setParticipants(prev => prev.filter(p => p.userId !== userId));
      }
    });

    socketRef.current.on('offer', handleOffer);
    socketRef.current.on('answer', handleAnswer);
    socketRef.current.on('ice-candidate', handleIceCandidate);

    socketRef.current.on('existing-users', async (users: { id: string; isScreenSharing: boolean }[]) => {
      for (const user of users) {
        if (!peersRef.current[user.id]) {
          const peer = createPeer(user.id);
          peersRef.current[user.id] = peer;
          
          // If user is screen sharing, we'll receive their screen share stream through normal WebRTC events
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socketRef.current?.emit('offer', { offer, to: user.id });
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        }
      }
    });

    socketRef.current.on('user-screen-share-started', (userId: string) => {
      console.log('User started screen sharing:', userId);
    });

    socketRef.current.on('user-screen-share-stopped', (userId: string) => {
      console.log('User stopped screen sharing:', userId);
    });
  }, [joined]);

  // WebRTC signaling handlers
  const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
    try {
      let peer = peersRef.current[from];
      
      // Check if we need to create or reset the peer connection
      if (peer?.signalingState !== 'stable') {
        if (peer) {
          console.warn('Closing existing peer connection in state:', peer.signalingState);
          peer.close();
        }
        peer = createPeer(from);
        peersRef.current[from] = peer;
      }

      // Set remote description
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and set local description
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      // Send answer
      socketRef.current?.emit('answer', {
        answer: peer.localDescription,
        to: from
      });

      // Process any queued candidates
      const queuedCandidates = iceCandidatesQueue.current[from] || [];
      for (const candidate of queuedCandidates) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding queued candidate:', err);
        }
      }
      delete iceCandidatesQueue.current[from];

    } catch (err) {
      console.error('Error handling offer:', err);
      // Clean up failed peer connection
      if (peersRef.current[from]) {
        peersRef.current[from].close();
        delete peersRef.current[from];
      }
    }
  };

  const handleAnswer = async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
    const peer = peersRef.current[from];
    if (!peer) {
      console.error('No peer connection found for:', from);
      return;
    }

    try {
      // Check connection state before setting remote description
      if (peer.signalingState === 'have-local-offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any queued candidates
        const queuedCandidates = iceCandidatesQueue.current[from] || [];
        for (const candidate of queuedCandidates) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding queued candidate:', err);
          }
        }
        delete iceCandidatesQueue.current[from];
      } else {
        console.warn('Peer connection in wrong state:', peer.signalingState);
      }
    } catch (err) {
      console.error('Error setting remote description:', err);
      
      // Try to recover the connection
      try {
        if (peer.signalingState !== 'closed') {
          // Recreate the peer connection
          peer.close();
          const newPeer = createPeer(from);
          peersRef.current[from] = newPeer;
          
          // Create new offer
          const offer = await newPeer.createOffer();
          await newPeer.setLocalDescription(offer);
          socketRef.current?.emit('offer', { offer, to: from });
        }
      } catch (recoveryErr) {
        console.error('Error recovering peer connection:', recoveryErr);
      }
    }
  };

  const handleIceCandidate = async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
    const peer = peersRef.current[from];
    
    try {
      if (peer?.remoteDescription && peer.signalingState !== 'closed') {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue the candidate if we're not ready
        if (!iceCandidatesQueue.current[from]) {
          iceCandidatesQueue.current[from] = [];
        }
        iceCandidatesQueue.current[from].push(candidate);
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  // Update peer.ontrack handler
  const handleTrack = (userId: string, stream: MediaStream) => {
    setParticipants(prev => {
      const existingParticipant = prev.find(p => p.userId === userId);
      
      if (existingParticipant) {
        // Check if stream already exists
        const streamExists = existingParticipant.streams.some(s => 
          s.id === stream.id || 
          s.getTracks().some(t1 => stream.getTracks().some(t2 => t1.id === t2.id))
        );
        
        if (streamExists) return prev;
        
        // Add new stream to existing participant
        return prev.map(p => 
          p.userId === userId 
            ? { ...p, streams: [...p.streams, stream] }
            : p
        );
      }
      
      // Add new participant with stream
      return [...prev, {
        userId,
        streams: [stream],
        isLocal: false
      }];
    });
  };

  // Add screen share function
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Capture the screen stream reference before cleanup
      const screenStream = screenStreamRef.current;
      
      // Stop all screen tracks
      screenStream?.getTracks().forEach(track => {
        track.stop();
        // Remove from all peer connections
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track === track);
          if (sender) peer.removeTrack(sender);
        });
      });

      // Clean up participant streams
      setParticipants(prev => 
        prev.map(p => 
          p.isLocal
            ? { 
                ...p, 
                streams: p.streams.filter(s => s.id !== screenStream?.id)
              }
            : p
        )
      );

      // Remove any video elements using the screen stream
      setSelectedVideos(prev => 
        prev.filter(video => 
          !(video.srcObject instanceof MediaStream) ||
          (video.srcObject as MediaStream).id !== screenStream?.id
        )
      );

      // Clean up refs and state
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-stopped', activeRoom);

      // Refresh peer connections
      Object.entries(peersRef.current).forEach(async ([userId, peer]) => {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socketRef.current?.emit('offer', { offer, to: userId });
        } catch (err) {
          console.error('Error refreshing peer connection:', err);
        }
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        // Notify server about screen share
        socketRef.current?.emit('screen-share-started', activeRoom);

        // Add screen share stream to local participant while keeping camera stream
        setParticipants(prev =>
          prev.map(p =>
            p.isLocal
              ? { ...p, streams: [...p.streams, screenStream] }
              : p
          )
        );

        // Add screen share tracks while keeping existing tracks
        Object.entries(peersRef.current).forEach(async ([userId, peer]) => {
          // Add screen share tracks
          screenStream.getTracks().forEach(track => {
            peer.addTrack(track, screenStream);
          });

          // Create new offer with all tracks
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socketRef.current?.emit('offer', {
              offer,
              to: userId
            });
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        });

        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    }
  };

  const handleVideoClick = (videoElement: HTMLVideoElement) => {
    setSelectedVideos(prev => {
      // Check if already at max capacity
      if (prev.length >= maxSelectedVideos && !prev.includes(videoElement)) {
        return prev;
      }
      
      const exists = prev.includes(videoElement);
      if (exists) {
        return prev.filter(v => v !== videoElement);
      } else {
        return [...prev, videoElement];
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pt-16 px-8 pb-8 md:pt-20">
      <div className="max-w-[2000px] mx-auto">
        {/* Top Section - Canvas and Layout */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Left Section - Canvas and Layout Bar */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Canvas Container */}
            <div className="relative w-full aspect-video max-h-[55vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            <VideoCanvas 
              videoRefs={selectedVideos} 
              isStreaming={isStreaming}
              streamingSocket={streamingSocketRef.current}
              rtmpUrl={rtmpUrl}
              streamKey={streamKey}
                width={canvasWidth}
                height={canvasHeight}
              fps={45}
            />
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {selectedVideos.length}/{maxSelectedVideos}
              </div>
            </div>

            {/* Layout Bar */}
            <div className="bg-zinc-900 p-3 md:p-4 rounded-xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <span className="text-white/80 text-sm md:text-base">Layout:</span>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setMaxSelectedVideos(num);
                        setSelectedVideos(prev => prev.slice(0, num));
                      }}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold transition-colors cursor-pointer text-sm md:text-base
                        ${maxSelectedVideos === num 
                          ? 'bg-white text-black hover:bg-white/90' 
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                      </div>
              </div>
              </div>
          </div>

          {/* Right Section - Room Controls - Only visible on large screens */}
          <div className="hidden lg:block w-[400px] bg-zinc-900 p-4 rounded-xl shadow-2xl">
            <div className="flex flex-col gap-6">
                {/* Room Settings */}
                <div>
                <h1 className="text-lg font-semibold mb-3 text-white">Room: {roomId}</h1>
                <input
                  type="text"
                  placeholder="Enter new room ID"
                  className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => joinRoom(roomId)}
                    className="w-full py-2 rounded-md bg-white text-black text-sm font-medium"
                  >
                    Change Room
                  </button>
                  <button
                    onClick={toggleScreenShare}
                    className={`w-full py-2 rounded-md font-semibold transition-colors ${
                      isScreenSharing 
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  </button>
                  </div>
      </div>

              {/* Divider */}
              <div className="h-px bg-zinc-800" />

                {/* Stream Settings */}
                <div>
                <h2 className="text-lg font-semibold mb-3">Stream Settings</h2>
        <input
          type="text"
                  placeholder="RTMP URL"
                  value={rtmpUrl}
                  onChange={(e) => setRtmpUrl(e.target.value)}
                  className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
                />
                <input
                  type="password"
                  placeholder="Stream Key"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
        />
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  disabled={selectedVideos.length === 0}
                  className={`w-full py-2 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isStreaming 
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  } ${selectedVideos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isStreaming ? (
                    <>
                      <VideoOff className="w-4 h-4" />
                      Stop Streaming
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Start Streaming
                    </>
                  )}
                </button>
                </div>
            </div>
          </div>
        </div>

        {/* Video Grid Section */}
        <div className="bg-zinc-900 p-2 px-6 rounded-xl shadow-2xl">
          <h2 className="text-xl font-bold mb-4">Available Streams</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {participants.map((participant) => 
              participant.streams.map((stream, streamIndex) => (
                <div
                  key={`${participant.userId}-${streamIndex}`}
                  className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer transform hover:scale-[1.02] transition-transform"
                  onClick={(e) => {
                    const video = e.currentTarget.querySelector('video');
                    if (video) handleVideoClick(video);
                  }}
                >
                  <video
                    ref={el => {
                      if (el && el.srcObject !== stream) {
                        el.srcObject = stream;
                        // Add retry logic for play failures
                        const playVideo = async () => {
                          try {
                            // Only play if video is paused
                            if (el.paused) {
                              await el.play();
                            }
                          } catch (err) {
                            if (err instanceof Error) {
                              // Handle abort errors by retrying
                              if (err.name === 'AbortError') {
                                console.log('Retrying video playback...');
                                // Retry after a short delay
                                setTimeout(playVideo, 100);
                              } else {
                                console.error('Video playback error:', err);
                              }
                            }
                          }
                        };
                        playVideo();
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    className="w-full h-full object-cover"
                    onLoadedMetadata={(e) => {
                      // Ensure video plays when metadata is loaded
                      const video = e.target as HTMLVideoElement;
                      if (video.paused) {
                        video.play().catch(err => {
                          if (err.name !== 'AbortError') {
                            console.error('Error playing video:', err);
                          }
                        });
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-sm">
                    <span className="bg-black/50 px-2 py-1 rounded">
                      {participant.isLocal ? 'You' : participant.userId}
                      {participant.streams.length > 1 && ` - Stream ${streamIndex + 1}`}
                    </span>
                    {selectedVideos.find(v => v.srcObject === stream) && (
                      <span className="bg-white text-black px-2 py-1 rounded-full text-xs">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

        {/* Room and Stream Settings - Only visible on small screens */}
        <div className="lg:hidden mt-8 bg-zinc-900 p-4 rounded-xl shadow-2xl">
          <div className="flex flex-col gap-6">
            {/* Room Settings */}
            <div>
              <h1 className="text-lg font-semibold mb-3 text-white">Room: {roomId}</h1>
              <input
                type="text"
                placeholder="Enter new room ID"
                className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => joinRoom(roomId)}
                  className="w-full py-2 rounded-md bg-white text-black text-sm font-medium"
                >
                  Change Room
                </button>
                <button
                  onClick={toggleScreenShare}
                  className={`w-full py-2 rounded-md font-semibold transition-colors ${
                    isScreenSharing 
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </button>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800" />

            {/* Stream Settings */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Stream Settings</h2>
              <input
                type="text"
                placeholder="RTMP URL"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
              />
              <input
                type="password"
                placeholder="Stream Key"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="w-full mb-2 p-2 rounded-md bg-black border border-zinc-800 text-sm"
              />
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                disabled={selectedVideos.length === 0}
                className={`w-full py-2 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isStreaming 
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                    : 'bg-white text-black hover:bg-zinc-200'
                } ${selectedVideos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isStreaming ? (
                  <>
                    <VideoOff className="w-4 h-4" />
                    Stop Streaming
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Start Streaming
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}