import { useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCProps {
  socket: Socket | null;
  localStream: MediaStream | null;
  onTrack: (userId: string, stream: MediaStream) => void;
}

export const useWebRTC = ({ socket, localStream, onTrack }: UseWebRTCProps) => {
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const iceCandidatesQueue = useRef<{ [key: string]: RTCIceCandidateInit[] }>({});

  const createPeer = useCallback((userId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        onTrack(userId, stream);
      }
    };

    return peer;
  }, [localStream, socket]);

  const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit; from: string }) => {
    const peer = peersRef.current[data.from];
    if (peer?.remoteDescription) {
      await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else {
      if (!iceCandidatesQueue.current[data.from]) {
        iceCandidatesQueue.current[data.from] = [];
      }
      iceCandidatesQueue.current[data.from].push(data.candidate);
    }
  }, []);

  const handleOffer = useCallback(async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
    try {
      let peer = peersRef.current[from];
      
      if (peer?.signalingState !== 'stable') {
        if (peer) {
          peer.close();
        }
        peer = createPeer(from);
        peersRef.current[from] = peer;
      }

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      socket?.emit('answer', {
        answer: peer.localDescription,
        to: from
      });

      const queuedCandidates = iceCandidatesQueue.current[from] || [];
      for (const candidate of queuedCandidates) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
      delete iceCandidatesQueue.current[from];

    } catch (err) {
      console.error('Error handling offer:', err);
      if (peersRef.current[from]) {
        peersRef.current[from].close();
        delete peersRef.current[from];
      }
    }
  }, [createPeer, socket]);

  const handleAnswer = useCallback(async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
    const peer = peersRef.current[from];
    if (!peer) {
      console.error('No peer connection found for:', from);
      return;
    }

    try {
      if (peer.signalingState === 'have-local-offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        
        const queuedCandidates = iceCandidatesQueue.current[from] || [];
        for (const candidate of queuedCandidates) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
        delete iceCandidatesQueue.current[from];
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  return {
    peersRef,
    iceCandidatesQueue,
    createPeer,
    handleIceCandidate,
    handleOffer,
    handleAnswer,
  };
}; 