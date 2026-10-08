import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// dotenv is listed in package.json but missing from the committed node_modules and
// lockfile, so load it opportunistically and fall back to Node's built-in loader.
try {
  await import('dotenv/config');
} catch {
  try {
    process.loadEnvFile?.();
  } catch {
    // no .env file; use the real environment
  }
}

const PORT = Number(process.env.PORT) || 8000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = CORS_ORIGIN.includes('*') ? '*' : CORS_ORIGIN;

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const STREAM_ID_MAX_LENGTH = 128;

const isValidRoomId = (roomId) => typeof roomId === 'string' && ROOM_ID_PATTERN.test(roomId);

// roomId -> Map<socketId, { isScreenSharing: boolean, screenStreamId: string | null }>
const rooms = new Map();

const app = express();
app.use(cors({ origin: corsOrigin }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    connections: io.engine.clientsCount,
    uptime: Math.round(process.uptime()),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  let currentRoom = null;

  const leaveCurrentRoom = () => {
    if (!currentRoom) return;
    const roomId = currentRoom;
    currentRoom = null;

    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
    socket.leave(roomId);
    socket.to(roomId).emit('user-disconnected', socket.id);
  };

  const getMember = () => (currentRoom ? rooms.get(currentRoom)?.get(socket.id) : undefined);

  socket.on('join-room', (roomId) => {
    if (!isValidRoomId(roomId)) {
      socket.emit('room-error', { message: 'Invalid room id (use 1-64 characters: letters, digits, "_" or "-")' });
      return;
    }

    try {
      leaveCurrentRoom();

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const room = rooms.get(roomId);

      const existingUsers = Array.from(room.entries()).map(([id, member]) => ({
        id,
        isScreenSharing: member.isScreenSharing,
        screenStreamId: member.screenStreamId,
      }));

      room.set(socket.id, { isScreenSharing: false, screenStreamId: null });
      currentRoom = roomId;
      socket.join(roomId);

      socket.emit('existing-users', existingUsers);
      socket.to(roomId).emit('user-connected', socket.id);
    } catch (err) {
      console.error('Error in join-room:', err);
      socket.emit('room-error', { message: 'Failed to join room' });
    }
  });

  socket.on('leave-room', () => {
    leaveCurrentRoom();
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom();
  });

  // Relays WebRTC signaling ({ description } or { candidate }) to a peer in the
  // sender's current room only.
  socket.on('signal', (data) => {
    if (!currentRoom || !data || typeof data !== 'object' || typeof data.to !== 'string') return;
    if (data.to === socket.id || !rooms.get(currentRoom)?.has(data.to)) return;

    const message = { from: socket.id };
    if (data.description) message.description = data.description;
    if (data.candidate) message.candidate = data.candidate;
    if (!message.description && !message.candidate) return;

    io.to(data.to).emit('signal', message);
  });

  socket.on('screen-share-started', (data) => {
    const member = getMember();
    if (!member) return;

    const streamId = data && typeof data.streamId === 'string' && data.streamId.length <= STREAM_ID_MAX_LENGTH
      ? data.streamId
      : null;
    member.isScreenSharing = true;
    member.screenStreamId = streamId;
    socket.to(currentRoom).emit('user-screen-share-started', { id: socket.id, streamId });
  });

  socket.on('screen-share-stopped', () => {
    const member = getMember();
    if (!member) return;

    const streamId = member.screenStreamId;
    member.isScreenSharing = false;
    member.screenStreamId = null;
    socket.to(currentRoom).emit('user-screen-share-stopped', { id: socket.id, streamId });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (CORS origin: ${CORS_ORIGIN.join(', ')})`);
});
