"use client"
import { useState, useRef, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Participant {
  userId: string;
  streams: MediaStream[];
  isLocal: boolean;
}

export default function CallPage() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const iceCandidatesQueue = useRef<{ [key: string]: RTCIceCandidateInit[] }>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [activeRoom, setActiveRoom] = useState<string>('');

  // Socket setup
  useEffect(() => {
    socketRef.current = io('http://192.168.119.220:8000');
    
    socketRef.current.on('existing-users', (userIds: string[]) => {
      userIds.forEach(userId => {
        if (userId !== socketRef.current?.id && !peersRef.current[userId]) {
          const peer = createPeer(userId);
          peersRef.current[userId] = peer;
        }
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Join room and setup local stream
  const joinRoom = async () => {
    if (!roomId) return;

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
      
      setActiveRoom(roomId);
      socketRef.current?.emit('join-room', roomId);
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
      // Stop screen sharing
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      
      // Remove only screen share stream from participants
      setParticipants(prev => 
        prev.map(p => 
          p.isLocal
            ? { ...p, streams: p.streams.filter(s => s !== screenStreamRef.current) }
            : p
        )
      );

      // Only remove screen share tracks
      Object.values(peersRef.current).forEach(peer => {
        const screenSenders = peer.getSenders().filter(sender => {
          return sender.track && screenStreamRef.current?.getTracks().includes(sender.track);
        });
        
        screenSenders.forEach(sender => peer.removeTrack(sender));
      });

      socketRef.current?.emit('screen-share-stopped', activeRoom);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md mb-8">
        <h1 className="text-2xl mb-4">Join a Room</h1>
        <input
          type="text"
          placeholder="Enter Room ID"
          className="border p-2 rounded mb-4 w-full"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={joinRoom}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Join Room
          </button>
          {joined && (
            <button
              onClick={toggleScreenShare}
              className={`px-4 py-2 rounded text-white ${
                isScreenSharing 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((participant) => 
            participant.streams.map((stream, streamIndex) => (
              <div
                key={`${participant.userId}-${streamIndex}`}
                className="aspect-video bg-black rounded-lg overflow-hidden relative"
              >
                <video
                  ref={el => {
                    if (el && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(console.error);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={participant.isLocal}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {participant.isLocal ? 'You' : participant.userId} 
                  {participant.streams.length > 1 && ` - Stream ${streamIndex + 1}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}