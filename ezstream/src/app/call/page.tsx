"use client"
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import VideoCanvas, { OverlayRenderer, StreamStatus } from '../components/layout/videoCanvas';
import OverlayEditor from '../components/layout/overlayEditor';
import { Video, VideoOff } from 'lucide-react';
import type { CanvasSource } from '@/types/canvas';
import { defaultOverlay, OverlayConfig } from '@/types/overlay';

const CALLING_SERVER_URL =
  process.env.NEXT_PUBLIC_CALLING_SERVER_URL || 'https://ezstream-callingserver.onrender.com';
const STREAMING_SERVER_URL =
  process.env.NEXT_PUBLIC_STREAMING_SERVER_URL || 'https://ezstream-server.onrender.com';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

function parseIceServers(raw: string | undefined): RTCIceServer[] {
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(server => server && typeof server === 'object' && 'urls' in server)
    ) {
      return parsed as RTCIceServer[];
    }
  } catch {
    // fall through to the default
  }
  console.warn('Ignoring invalid NEXT_PUBLIC_ICE_SERVERS (expected a JSON array of RTCIceServer)');
  return DEFAULT_ICE_SERVERS;
}

const ICE_SERVERS = parseIceServers(process.env.NEXT_PUBLIC_ICE_SERVERS);

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// How long an existing user waits for the newcomer's offer before negotiating itself.
const FIRST_OFFER_TIMEOUT_MS = 5000;
const SCREEN_MUTE_GRACE_MS = 3000;

interface ParticipantStream {
  stream: MediaStream;
  isScreen: boolean;
}

interface Participant {
  userId: string;
  streams: ParticipantStream[];
  isLocal: boolean;
}

interface Tile {
  id: string;
  stream: MediaStream;
  isLocal: boolean;
  isScreen: boolean;
  label: string;
}

interface PeerState {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  // Existing users hold their own negotiation until the newcomer's first offer
  // has been answered, so exactly one side starts.
  awaitingFirstOffer: boolean;
  negotiationDeferred: boolean;
  firstOfferTimer?: ReturnType<typeof setTimeout>;
  // Signaling messages for one peer are applied strictly in order.
  signalQueue: Promise<void>;
}

interface SignalMessage {
  from: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ExistingUser {
  id: string;
  isScreenSharing: boolean;
  screenStreamId?: string | null;
}

interface ScreenShareEvent {
  id: string;
  streamId?: string | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const shortId = (id: string) => id.slice(0, 6);

const sameSources = (a: CanvasSource[], b: CanvasSource[]) =>
  a.length === b.length &&
  a.every((source, i) =>
    source.id === b[i].id &&
    source.video === b[i].video &&
    source.label === b[i].label &&
    source.isScreen === b[i].isScreen
  );

const playVideo = (el: HTMLVideoElement, stream: MediaStream, attempt = 0) => {
  if (el.srcObject !== stream || !el.paused) return;
  el.play().catch(err => {
    if (err instanceof Error && err.name === 'AbortError' && attempt < 5) {
      // srcObject changes abort pending play() calls; retry shortly
      setTimeout(() => playVideo(el, stream, attempt + 1), 100);
    } else {
      console.error('Video playback error:', err);
    }
  });
};

export default function CallPage() {
  const [roomId, setRoomId] = useState('');
  const [activeRoom, setActiveRoom] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamingSocketRef = useRef<Socket | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenShareStartingRef = useRef(false);
  const peersRef = useRef(new Map<string, PeerState>());
  // userId -> screen stream id announced via screen-share events
  const remoteScreenIdsRef = useRef(new Map<string, string>());
  // userId -> id of the first non-screen stream received (their camera)
  const remoteCameraIdsRef = useRef(new Map<string, string>());
  const watchedStreamsRef = useRef(new WeakSet<MediaStream>());
  const watchedTracksRef = useRef(new WeakSet<MediaStreamTrack>());

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Canvas selection, by stream id (order = selection order)
  const [selectedStreamIds, setSelectedStreamIds] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<CanvasSource[]>([]);
  const videoElementsRef = useRef(new Map<string, HTMLVideoElement>());
  const videoRefCallbacksRef = useRef(new Map<string, (el: HTMLVideoElement | null) => void>());
  const [videoElementsVersion, setVideoElementsVersion] = useState(0);

  // Streaming
  const [streamingSocket, setStreamingSocket] = useState<Socket | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [streamState, setStreamState] = useState<StreamStatus['state']>('idle');
  const [streamError, setStreamError] = useState('');
  const [overlay, setOverlay] = useState<OverlayConfig>(defaultOverlay);
  const [overlayRenderer, setOverlayRenderer] = useState<OverlayRenderer>('fallback');

  const handleStreamStatus = useCallback((status: StreamStatus) => {
    setStreamState(status.state);
    if (status.state === 'starting') setStreamError('');
    if (status.state === 'error') {
      setStreamError(status.message);
      setIsStreaming(false);
    }
  }, []);

  // Add function to generate random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  const sendSignal = (to: string, payload: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
    socketRef.current?.emit('signal', { to, ...payload });
  };

  // ---- Bandwidth: every client uploads one copy per peer in a mesh ----

  const setSenderBitrate = async (sender: RTCRtpSender, maxBitrate: number, isScreen: boolean) => {
    try {
      const params = sender.getParameters();
      // Encodings are empty until the sender has been negotiated; re-applied on 'stable'.
      if (!params.encodings?.length || params.encodings[0].maxBitrate === maxBitrate) return;
      params.encodings[0].maxBitrate = maxBitrate;
      if (isScreen) params.degradationPreference = 'maintain-resolution';
      await sender.setParameters(params);
    } catch (err) {
      if (!isScreen) {
        console.warn('Could not set sender bitrate:', err);
        return;
      }
      // Some browsers reject degradationPreference; retry with the bitrate cap only.
      try {
        const params = sender.getParameters();
        if (!params.encodings?.length) return;
        params.encodings[0].maxBitrate = maxBitrate;
        await sender.setParameters(params);
      } catch (retryErr) {
        console.warn('Could not set screen sender bitrate:', retryErr);
      }
    }
  };

  const applyBitrateLimits = (only?: RTCPeerConnection) => {
    const count = Math.max(1, peersRef.current.size);
    const screenTracks = screenStreamRef.current?.getVideoTracks() ?? [];
    const cameraBitrate = Math.round(clamp(2_500_000 / count, 250_000, 1_500_000));
    const screenBitrate = Math.round(Math.max(2_500_000 / count, 500_000));

    peersRef.current.forEach(({ pc }) => {
      if ((only && pc !== only) || pc.signalingState === 'closed') return;
      pc.getSenders().forEach(sender => {
        if (sender.track?.kind !== 'video') return;
        const isScreen = screenTracks.includes(sender.track);
        void setSenderBitrate(sender, isScreen ? screenBitrate : cameraBitrate, isScreen);
      });
    });
  };

  // ---- Remote streams ----

  const isRemoteScreenStream = (userId: string, streamId: string) => {
    if (remoteScreenIdsRef.current.get(userId) === streamId) return true;
    // Fallback when no hint arrived: anything other than the user's first stream is a screen
    const cameraId = remoteCameraIdsRef.current.get(userId);
    return cameraId !== undefined && cameraId !== streamId;
  };

  const addRemoteStream = (userId: string, stream: MediaStream) => {
    const isScreen = isRemoteScreenStream(userId, stream.id);
    setParticipants(prev => {
      const existing = prev.find(p => p.userId === userId);
      if (!existing) {
        return [...prev, { userId, streams: [{ stream, isScreen }], isLocal: false }];
      }
      if (existing.streams.some(s => s.stream.id === stream.id)) return prev;
      return prev.map(p =>
        p.userId === userId ? { ...p, streams: [...p.streams, { stream, isScreen }] } : p
      );
    });
  };

  const removeRemoteStreams = (userId: string, shouldRemove: (stream: MediaStream) => boolean) => {
    setParticipants(prev => {
      const existing = prev.find(p => p.userId === userId);
      if (!existing || !existing.streams.some(s => shouldRemove(s.stream))) return prev;
      return prev
        .map(p => (p.userId === userId ? { ...p, streams: p.streams.filter(s => !shouldRemove(s.stream)) } : p))
        .filter(p => p.isLocal || p.streams.length > 0);
    });
  };

  // Drops a remote stream once it has nothing left to show: a screen stream without
  // live video, or a camera stream without any live track.
  const syncRemoteStream = (userId: string, stream: MediaStream) => {
    if (!peersRef.current.has(userId)) return;
    const live = (track: MediaStreamTrack) => track.readyState === 'live';
    const hasMedia = isRemoteScreenStream(userId, stream.id)
      ? stream.getVideoTracks().some(live)
      : stream.getTracks().some(live);
    if (!hasMedia) removeRemoteStreams(userId, s => s.id === stream.id);
  };

  const watchRemoteTrack = (userId: string, stream: MediaStream, track: MediaStreamTrack) => {
    if (!watchedStreamsRef.current.has(stream)) {
      watchedStreamsRef.current.add(stream);
      // Fired when the sender calls removeTrack and we apply the renegotiation
      stream.addEventListener('removetrack', () => syncRemoteStream(userId, stream));
    }
    if (watchedTracksRef.current.has(track)) return;
    watchedTracksRef.current.add(track);
    track.addEventListener('ended', () => syncRemoteStream(userId, stream));
    if (track.kind === 'video') {
      // A removed remote track is muted rather than ended. Mutes also happen on
      // network hiccups, so only act on a lasting mute of a screen stream that is
      // no longer announced as shared.
      track.addEventListener('mute', () => {
        setTimeout(() => {
          if (
            track.muted &&
            isRemoteScreenStream(userId, stream.id) &&
            remoteScreenIdsRef.current.get(userId) !== stream.id
          ) {
            removeRemoteStreams(userId, s => s.id === stream.id);
          }
        }, SCREEN_MUTE_GRACE_MS);
      });
    }
  };

  const handleRemoteTrack = (userId: string, stream: MediaStream, track: MediaStreamTrack) => {
    if (!remoteCameraIdsRef.current.has(userId) && remoteScreenIdsRef.current.get(userId) !== stream.id) {
      remoteCameraIdsRef.current.set(userId, stream.id);
    }
    watchRemoteTrack(userId, stream, track);
    addRemoteStream(userId, stream);
  };

  // ---- Peer connections (perfect negotiation) ----

  const negotiate = async (userId: string, peer: PeerState) => {
    if (peer.awaitingFirstOffer) {
      peer.negotiationDeferred = true;
      return;
    }
    const { pc } = peer;
    if (peer.makingOffer || pc.signalingState !== 'stable') return;
    try {
      peer.makingOffer = true;
      await pc.setLocalDescription();
      if (pc.localDescription) sendSignal(userId, { description: pc.localDescription.toJSON() });
    } catch (err) {
      console.error('Error creating offer:', err);
    } finally {
      peer.makingOffer = false;
    }
  };

  const releaseNegotiationHold = (userId: string, peer: PeerState) => {
    clearTimeout(peer.firstOfferTimer);
    if (!peer.awaitingFirstOffer) return;
    peer.awaitingFirstOffer = false;
    // Only offer if some of our transceivers were not covered by the remote offer
    // (e.g. we are screen sharing and the newcomer only sent a camera).
    const unnegotiated = peer.pc.getTransceivers().some(t => t.mid === null);
    if (peer.negotiationDeferred && unnegotiated) void negotiate(userId, peer);
    peer.negotiationDeferred = false;
  };

  const createPeer = (userId: string, awaitingFirstOffer: boolean): PeerState => {
    const existing = peersRef.current.get(userId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: PeerState = {
      pc,
      // Deterministic roles: both sides compare the same two ids.
      polite: (socketRef.current?.id ?? '') < userId,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      awaitingFirstOffer,
      negotiationDeferred: false,
      signalQueue: Promise.resolve(),
    };
    peersRef.current.set(userId, peer);
    setPeerCount(peersRef.current.size);

    pc.onnegotiationneeded = () => {
      void negotiate(userId, peer);
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(userId, { candidate: candidate.toJSON() });
    };
    pc.ontrack = ({ track, streams }) => {
      if (streams[0]) handleRemoteTrack(userId, streams[0], track);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && typeof pc.restartIce === 'function') {
        pc.restartIce(); // triggers negotiationneeded with an ICE-restart offer
      } else if (pc.connectionState === 'connected') {
        applyBitrateLimits(pc);
      }
    };
    pc.onsignalingstatechange = () => {
      if (pc.signalingState === 'stable') applyBitrateLimits(pc);
    };

    // Camera first, then the screen as its own stream, so the remote side gets
    // one MediaStream per source.
    const local = localStreamRef.current;
    const screen = screenStreamRef.current;
    local?.getTracks().forEach(track => pc.addTrack(track, local));
    screen?.getTracks().forEach(track => pc.addTrack(track, screen));

    if (awaitingFirstOffer) {
      peer.firstOfferTimer = setTimeout(() => releaseNegotiationHold(userId, peer), FIRST_OFFER_TIMEOUT_MS);
    } else if (!local?.getTracks().length) {
      // Nothing to send, but we still need m-lines to receive the other side.
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    applyBitrateLimits();
    return peer;
  };

  const closePeer = (userId: string) => {
    const peer = peersRef.current.get(userId);
    if (!peer) return;
    // Remove first so late track events for this peer are ignored
    peersRef.current.delete(userId);
    clearTimeout(peer.firstOfferTimer);
    peer.pc.close();
    remoteScreenIdsRef.current.delete(userId);
    remoteCameraIdsRef.current.delete(userId);
    setPeerCount(peersRef.current.size);
    setParticipants(prev => prev.filter(p => p.userId !== userId));
    applyBitrateLimits();
  };

  const closeAllPeers = () => {
    Array.from(peersRef.current.keys()).forEach(closePeer);
    remoteScreenIdsRef.current.clear();
    remoteCameraIdsRef.current.clear();
    setParticipants(prev => prev.filter(p => p.isLocal));
  };

  const flushPendingCandidates = async (peer: PeerState) => {
    const candidates = peer.pendingCandidates.splice(0);
    for (const candidate of candidates) {
      try {
        await peer.pc.addIceCandidate(candidate);
      } catch (err) {
        if (!peer.ignoreOffer) console.warn('Error adding queued ICE candidate:', err);
      }
    }
  };

  const processSignal = async (from: string, peer: PeerState, { description, candidate }: SignalMessage) => {
    const { pc } = peer;
    if (pc.signalingState === 'closed') return;
    try {
      if (description) {
        // Messages are serialized per peer, so a remote answer is never "in flight" here.
        const offerCollision =
          description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;

        // On the polite side this implicitly rolls back our own pending offer.
        await pc.setRemoteDescription(description);
        await flushPendingCandidates(peer);

        if (description.type === 'offer') {
          await pc.setLocalDescription();
          if (pc.localDescription) sendSignal(from, { description: pc.localDescription.toJSON() });
          releaseNegotiationHold(from, peer);
        }
      } else if (candidate) {
        if (!pc.remoteDescription) {
          peer.pendingCandidates.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          // Candidates for an offer we ignored are expected to fail
          if (!peer.ignoreOffer) console.warn('Error adding ICE candidate:', err);
        }
      }
    } catch (err) {
      console.error('Error handling signal from', from, err);
    }
  };

  const handleSignal = (message: SignalMessage) => {
    // Peers are always created on existing-users / user-connected first; anything
    // else is a stale message from a room we already left.
    const peer = peersRef.current.get(message.from);
    if (!peer) return;
    peer.signalQueue = peer.signalQueue.then(() => processSignal(message.from, peer, message));
  };

  // ---- Rooms ----

  const emitJoin = (socket: Socket, room: string) => {
    socket.emit('join-room', room);
    // Re-announce an ongoing screen share to the new room
    if (screenStreamRef.current) {
      socket.emit('screen-share-started', { streamId: screenStreamRef.current.id });
    }
  };

  const enterRoom = (room: string) => {
    currentRoomRef.current = room;
    setActiveRoom(room);
    setRoomError(null);
    const socket = socketRef.current;
    // When not connected yet, the 'connect' handler joins.
    if (socket?.connected) emitJoin(socket, room);
  };

  const changeRoom = () => {
    const nextRoom = roomId.trim();
    if (!ROOM_ID_PATTERN.test(nextRoom)) {
      setRoomError('Room id must be 1-64 letters, digits, "_" or "-"');
      return;
    }
    if (nextRoom === currentRoomRef.current) return;
    if (currentRoomRef.current && socketRef.current?.connected) {
      socketRef.current.emit('leave-room');
    }
    closeAllPeers();
    enterRoom(nextRoom);
  };

  // Streaming socket
  useEffect(() => {
    const streamingSocket = io(STREAMING_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });
    streamingSocketRef.current = streamingSocket;
    setStreamingSocket(streamingSocket);

    const onConnectError = (error: Error) => {
      console.error('Streaming socket error:', error);
    };
    streamingSocket.on('connect_error', onConnectError);

    return () => {
      streamingSocket.off('connect_error', onConnectError);
      streamingSocket.disconnect();
      streamingSocketRef.current = null;
      setStreamingSocket(null);
    };
  }, []);

  // Calling socket, local media and the initial room. All handlers only touch
  // refs and state setters, so registering them once is safe.
  useEffect(() => {
    const socket = io(CALLING_SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    const onConnect = () => {
      // A (re)connect means a new socket id; rebuild the mesh from scratch.
      if (!currentRoomRef.current) return;
      closeAllPeers();
      emitJoin(socket, currentRoomRef.current);
    };
    const onConnectError = (error: Error) => {
      console.error('Video call socket error:', error);
    };
    const onRoomError = ({ message }: { message: string }) => {
      setRoomError(message);
    };
    const onExistingUsers = (users: ExistingUser[]) => {
      users.forEach(user => {
        if (user.id === socket.id) return;
        if (user.isScreenSharing && user.screenStreamId) {
          remoteScreenIdsRef.current.set(user.id, user.screenStreamId);
        }
        // The newcomer starts: adding tracks fires negotiationneeded.
        createPeer(user.id, false);
      });
    };
    const onUserConnected = (userId: string) => {
      createPeer(userId, true);
    };
    const onUserDisconnected = (userId: string) => {
      closePeer(userId);
    };
    const onScreenShareStarted = ({ id, streamId }: ScreenShareEvent) => {
      if (!streamId || !peersRef.current.has(id)) return;
      remoteScreenIdsRef.current.set(id, streamId);
      setParticipants(prev => prev.map(p =>
        p.userId === id && p.streams.some(s => s.stream.id === streamId && !s.isScreen)
          ? { ...p, streams: p.streams.map(s => (s.stream.id === streamId ? { ...s, isScreen: true } : s)) }
          : p
      ));
    };
    const onScreenShareStopped = ({ id, streamId }: ScreenShareEvent) => {
      const screenId = streamId || remoteScreenIdsRef.current.get(id);
      const cameraId = remoteCameraIdsRef.current.get(id);
      remoteScreenIdsRef.current.delete(id);
      removeRemoteStreams(id, stream =>
        screenId ? stream.id === screenId : cameraId !== undefined && stream.id !== cameraId
      );
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('room-error', onRoomError);
    socket.on('existing-users', onExistingUsers);
    socket.on('user-connected', onUserConnected);
    socket.on('user-disconnected', onUserDisconnected);
    socket.on('signal', handleSignal);
    socket.on('user-screen-share-started', onScreenShareStarted);
    socket.on('user-screen-share-stopped', onScreenShareStopped);

    let cancelled = false;
    const start = async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
      if (cancelled) {
        stream?.getTracks().forEach(track => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setParticipants(prev => [
        { userId: 'local', streams: stream ? [{ stream, isScreen: false }] : [], isLocal: true },
        ...prev.filter(p => !p.isLocal),
      ]);

      // The user may already have picked a room while media was loading
      if (!currentRoomRef.current) {
        const randomRoom = generateRoomId();
        setRoomId(randomRoom);
        enterRoom(randomRoom);
      }
    };
    void start();

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('room-error', onRoomError);
      socket.off('existing-users', onExistingUsers);
      socket.off('user-connected', onUserConnected);
      socket.off('user-disconnected', onUserDisconnected);
      socket.off('signal', handleSignal);
      socket.off('user-screen-share-started', onScreenShareStarted);
      socket.off('user-screen-share-stopped', onScreenShareStopped);
      socket.disconnect();
      socketRef.current = null;
      currentRoomRef.current = null;

      closeAllPeers();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    };
  }, []);

  // ---- Screen share ----

  const stopScreenShare = () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;
    screenStreamRef.current = null;

    // removeTrack fires negotiationneeded on each peer
    const screenTracks = screenStream.getTracks();
    peersRef.current.forEach(({ pc }) => {
      pc.getSenders().forEach(sender => {
        if (sender.track && screenTracks.includes(sender.track)) pc.removeTrack(sender);
      });
    });
    screenTracks.forEach(track => track.stop());

    setIsScreenSharing(false);
    setParticipants(prev => prev.map(p =>
      p.isLocal ? { ...p, streams: p.streams.filter(s => s.stream !== screenStream) } : p
    ));
    socketRef.current?.emit('screen-share-stopped');
  };

  const startScreenShare = async () => {
    if (screenStreamRef.current || screenShareStartingRef.current) return;
    screenShareStartingRef.current = true;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      screenStream.getVideoTracks().forEach(track => {
        track.contentHint = 'detail';
        // Browser's own "Stop sharing" button
        track.addEventListener('ended', stopScreenShare);
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      setParticipants(prev => prev.map(p =>
        p.isLocal ? { ...p, streams: [...p.streams, { stream: screenStream, isScreen: true }] } : p
      ));

      // Announce before adding tracks so peers know which stream is the screen
      socketRef.current?.emit('screen-share-started', { streamId: screenStream.id });
      peersRef.current.forEach(({ pc }) => {
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
      });
    } catch (err) {
      console.error('Error starting screen share:', err);
    } finally {
      screenShareStartingRef.current = false;
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  };

  // ---- Tiles and canvas selection ----

  const tiles = useMemo<Tile[]>(() =>
    participants.flatMap(participant =>
      participant.streams.map(({ stream, isScreen }) => {
        const name = participant.isLocal ? 'You' : shortId(participant.userId);
        return {
          id: stream.id,
          stream,
          isLocal: participant.isLocal,
          isScreen,
          label: isScreen ? `${name} (screen)` : name,
        };
      })
    ),
    [participants]
  );

  // Stable per-stream ref callbacks: React only calls them on mount/unmount, so
  // playback isn't restarted on every render.
  const getVideoRef = (streamId: string, stream: MediaStream) => {
    let callback = videoRefCallbacksRef.current.get(streamId);
    if (!callback) {
      callback = (el: HTMLVideoElement | null) => {
        const elements = videoElementsRef.current;
        if (el) {
          if (el.srcObject !== stream) {
            el.srcObject = stream;
            playVideo(el, stream);
          }
          if (elements.get(streamId) !== el) {
            elements.set(streamId, el);
            setVideoElementsVersion(v => v + 1);
          }
        } else if (elements.has(streamId)) {
          elements.delete(streamId);
          setVideoElementsVersion(v => v + 1);
        }
      };
      videoRefCallbacksRef.current.set(streamId, callback);
    }
    return callback;
  };

  // Forget selections and ref callbacks for streams that are gone
  useEffect(() => {
    const liveIds = new Set(tiles.map(tile => tile.id));
    setSelectedStreamIds(prev => {
      const next = prev.filter(id => liveIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    videoRefCallbacksRef.current.forEach((_, id) => {
      if (!liveIds.has(id)) videoRefCallbacksRef.current.delete(id);
    });
  }, [tiles]);

  useEffect(() => {
    const tilesById = new Map(tiles.map(tile => [tile.id, tile]));
    const next: CanvasSource[] = [];
    selectedStreamIds.forEach(id => {
      const tile = tilesById.get(id);
      const video = videoElementsRef.current.get(id);
      if (tile && video) next.push({ id, label: tile.label, video, isScreen: tile.isScreen });
    });
    setSelectedSources(prev => (sameSources(prev, next) ? prev : next));
  }, [tiles, selectedStreamIds, videoElementsVersion]);

  const toggleSelection = (streamId: string) => {
    setSelectedStreamIds(prev =>
      prev.includes(streamId) ? prev.filter(id => id !== streamId) : [...prev, streamId]
    );
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
              sources={selectedSources}
              overlay={overlay}
              isStreaming={isStreaming}
              streamingSocket={streamingSocket}
              rtmpUrl={rtmpUrl}
              streamKey={streamKey}
              width={1280}
              height={720}
              fps={30}
              bitrate={2_500_000}
              onStatusChange={handleStreamStatus}
              onRendererChange={setOverlayRenderer}
            />
          </div>

          {/* Room Controls - Right */}
          <div className="w-[500px] bg-zinc-900 p-4 rounded-xl shadow-2xl">
            <div className="flex gap-4">
              {/* Join Room Section */}
              <div className="flex-1">
                <h1 className="text-xl font-bold mb-4 text-white">Room: {activeRoom || roomId}</h1>
                <input
                  type="text"
                  placeholder="Enter new room ID"
                  className="w-full mb-3 p-3 rounded-lg bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
                  value={roomId}
                  maxLength={64}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                {roomError && (
                  <p className="mb-3 text-sm text-red-400">{roomError}</p>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={changeRoom}
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
                  disabled={selectedSources.length === 0}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isStreaming
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                      : 'bg-white text-black hover:bg-zinc-200'
                  } ${selectedSources.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                {(isStreaming || streamError) && (
                  <p className={`mt-3 text-sm ${streamError ? 'text-red-400' : 'text-zinc-400'}`}>
                    {streamError ||
                      (streamState === 'live' ? '● Live' : streamState === 'starting' ? 'Connecting…' : '')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay Section */}
        <div className="bg-zinc-900 p-6 rounded-xl shadow-2xl mt-4">
          <OverlayEditor value={overlay} onChange={setOverlay} renderer={overlayRenderer} />
        </div>

        {/* Video Grid Section */}
        <div className="bg-zinc-900 p-6 rounded-xl shadow-2xl mt-4">
          <h2 className="text-xl font-bold mb-4">
            Available Streams
            <span className="ml-3 text-sm font-normal text-zinc-500">
              {peerCount + 1} in call
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {tiles.map((tile) => {
              const selectionIndex = selectedStreamIds.indexOf(tile.id);
              return (
                <div
                  key={tile.id}
                  className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer transform hover:scale-[1.02] transition-transform"
                  onClick={() => toggleSelection(tile.id)}
                >
                  <video
                    ref={getVideoRef(tile.id, tile.stream)}
                    autoPlay
                    playsInline
                    muted={tile.isLocal}
                    className={`w-full h-full ${tile.isScreen ? 'object-contain' : 'object-cover'}`}
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
                      {tile.label}
                    </span>
                    {selectionIndex !== -1 && (
                      <span className="bg-white text-black px-2 py-1 rounded-full text-xs">
                        Selected {selectionIndex + 1}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
