import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  const rooms = new Map();
  let currentRoom = null;

  const cleanup = (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
      }
      socket.to(roomId).emit("user-disconnected", socket.id);
    }
  };

  socket.on("join-room", (roomId) => {
    try {
      // Clean up previous room if any
      if (currentRoom) {
        cleanup(currentRoom);
      }

      currentRoom = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      rooms.get(roomId).set(socket.id, {
        streams: [],
        isScreenSharing: false,
      });

      const otherUsers = Array.from(rooms.get(roomId).entries())
        .filter(([id]) => id !== socket.id)
        .map(([id, data]) => ({
          id,
          isScreenSharing: data.isScreenSharing,
        }));

      socket.emit("existing-users", otherUsers);
      socket.to(roomId).emit("user-connected", socket.id);
    } catch (err) {
      console.error("Error in join-room:", err);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      cleanup(currentRoom);
    }
  });

  // Add error handling to signaling events
  const forwardEvent = (eventName) => (data) => {
    try {
      socket.to(data.to).emit(eventName, { ...data, from: socket.id });
    } catch (err) {
      console.error(`Error forwarding ${eventName}:`, err);
    }
  };

  socket.on("offer", forwardEvent("offer"));
  socket.on("answer", forwardEvent("answer"));
  socket.on("ice-candidate", forwardEvent("ice-candidate"));

  socket.on("screen-share-started", (roomId) => {
    if (rooms.has(roomId)) {
      const participant = rooms.get(roomId).get(socket.id);
      if (participant) {
        participant.isScreenSharing = true;
      }
    }
    socket.to(roomId).emit("user-screen-share-started", socket.id);
  });

  socket.on("screen-share-stopped", (roomId) => {
    if (rooms.has(roomId)) {
      const participant = rooms.get(roomId).get(socket.id);
      if (participant) {
        participant.isScreenSharing = false;
      }
    }
    socket.to(roomId).emit("user-screen-share-stopped", socket.id);
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
