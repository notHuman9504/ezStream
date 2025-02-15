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
  
    // Add camera tracks if not already added
    if (localStreamRef.current) {
      const existingTracks = peer.getSenders().map(s => s.track);
      localStreamRef.current.getTracks().forEach(track => {
        if (!existingTracks.includes(track)) {
          peer.addTrack(track, localStreamRef.current!);
        }
      });
    }
  
    // Add screen tracks if not already added
    if (screenStreamRef.current) {
      const existingTracks = peer.getSenders().map(s => s.track);
      screenStreamRef.current.getTracks().forEach(track => {
        if (!existingTracks.includes(track)) {
          peer.addTrack(track, screenStreamRef.current!);
        }
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
        });
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
      const exists = prev.includes(videoElement);
      if (exists) {
        // Remove if already selected
        return prev.filter(v => v !== videoElement);
      } else {
        // Add if not selected
        return [...prev, videoElement];
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Main Container */}
      <div className="max-w-[2000px] mx-auto">
        {/* Top Section - Canvas and Room Join */}
        <div className="flex gap-8 mb-8 h-[400px]">
          {/* Canvas Section - Left */}
          <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            <VideoCanvas 
              videoRefs={selectedVideos} 
              isStreaming={isStreaming}
              streamingSocket={streamingSocketRef.current}
              rtmpUrl={rtmpUrl}
              streamKey={streamKey}
              width={640}
              height={360}
              fps={45}
            />
          </div>

          {/* Room Controls - Right */}
          <div className="w-[500px] bg-zinc-900 p-4 rounded-xl shadow-2xl">
            <div className="flex gap-4">
              {/* Join Room Section */}
              <div className="flex-1">
                <h1 className="text-xl font-bold mb-4 text-white">Room: {roomId}</h1>
                <input
                  type="text"
                  placeholder="Enter new room ID"
                  className="w-full mb-3 p-3 rounded-lg bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => joinRoom(roomId)}
                    className="w-full py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    Change Room
                  </button>
                  <button
                    onClick={toggleScreenShare}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      isScreenSharing 
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  </button>
                </div>
      </div>

              {/* Streaming Controls */}
              <div className="flex-1 border-l border-zinc-800 pl-4">
                <h2 className="text-xl font-bold mb-4">Stream Settings</h2>
        <input
          type="text"
                  placeholder="RTMP URL"
                  value={rtmpUrl}
                  onChange={(e) => setRtmpUrl(e.target.value)}
                  className="w-full mb-3 p-3 rounded-lg bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                />
                <input
                  type="password"
                  placeholder="Stream Key"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  className="w-full mb-3 p-3 rounded-lg bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  disabled={selectedVideos.length === 0}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
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
        <div className="bg-zinc-900 p-6 rounded-xl shadow-2xl mt-4">
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
      </div>
    </div>
  );
}