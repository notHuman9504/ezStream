import dotenv from "dotenv";
import http from "http";
import path from "path";
import { spawn } from "child_process";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";

// Configure dotenv
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Updated CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e7,
});

app.use(express.static(path.resolve(__dirname, "./public")));

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  let ffmpegProcess = null;

  // Keep the existing rooms map at socket level
  const rooms = new Map();
  let currentRoom = null;

  // Improved cleanup function
  const cleanup = (roomId) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
      }
      socket.to(roomId).emit("user-disconnected", socket.id);
      console.log(
        `User ${socket.id} left room ${roomId}, remaining users: ${room.size}`
      );
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
        joinedAt: Date.now(), // Add timestamp for connection diagnostics
      });

      const otherUsers = Array.from(rooms.get(roomId).entries())
        .filter(([id]) => id !== socket.id)
        .map(([id, data]) => ({
          id,
          isScreenSharing: data.isScreenSharing,
        }));

      console.log(
        `User ${socket.id} joined room ${roomId}, existing users: ${otherUsers.length}`
      );

      // Emit to joining user
      socket.emit("existing-users", otherUsers);

      // Emit to existing users with a small delay to ensure client is ready
      setTimeout(() => {
        socket.to(roomId).emit("user-connected", socket.id);
      }, 1000);
    } catch (err) {
      console.error("Error in join-room:", err);
      socket.emit("error", "Failed to join room");
    }
  });

  // Add connection status check
  socket.on("connection-status", (data) => {
    const { peerId, status } = data;
    console.log(`Connection status from ${socket.id} to ${peerId}: ${status}`);

    // Forward the status to the peer
    socket.to(peerId).emit("peer-connection-status", {
      from: socket.id,
      status,
    });
  });

  // Improved signaling with reliability checks
  const forwardEvent = (eventName) => (data) => {
    try {
      if (!data || !data.to) {
        console.error(`Invalid ${eventName} data:`, data);
        return;
      }

      console.log(`Forwarding ${eventName} from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit(eventName, { ...data, from: socket.id });
    } catch (err) {
      console.error(`Error forwarding ${eventName}:`, err);
    }
  };

  socket.on("offer", forwardEvent("offer"));
  socket.on("answer", forwardEvent("answer"));
  socket.on("ice-candidate", forwardEvent("ice-candidate"));

  // Add stream-ready event to ensure both sides know when video is flowing
  socket.on("stream-ready", (data) => {
    console.log(`Stream ready from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit("stream-ready", { from: socket.id });
  });

  const startFFmpeg = (config) => {
    const { rtmpUrl, streamKey, settings } = config;
    const outputUrl = `${rtmpUrl}/${streamKey}`;
    settings.bitrate = 1000000;

    const args = [
      "-analyzeduration",
      "0",
      "-probesize",
      "32",
      "-f",
      "webm",
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "zerolatency",
      "-b:v",
      `${settings.bitrate}`,
      "-maxrate",
      `${settings.bitrate}`,
      "-bufsize",
      `${settings.bitrate * 2}`,
      "-pix_fmt",
      "yuv420p",
      "-g",
      "60",
      "-r",
      `${settings.fps}`,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-f",
      "flv",
      "-flvflags",
      "no_duration_filesize",
      outputUrl,
    ];

    ffmpegProcess = spawn("ffmpeg", args);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log("[FFmpeg]", data.toString());
    });

    ffmpegProcess.on("exit", (code) => {
      console.log(`FFmpeg exited with code ${code}`);
      ffmpegProcess = null;
    });
  };

  socket.on("stream:start", (config) => {
    console.log("Starting stream to:", config.rtmpUrl);
    startFFmpeg(config);
  });

  socket.on("stream:data", (data) => {
    if (ffmpegProcess?.stdin.writable) {
      ffmpegProcess.stdin.write(data, (err) => {
        if (err) console.error("Stream write error:", err);
      });
    }
  });

  socket.on("stream:stop", () => {
    if (ffmpegProcess) {
      ffmpegProcess.stdin.end();
      ffmpegProcess.kill("SIGINT");
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (ffmpegProcess) {
      ffmpegProcess.kill("SIGINT");
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
