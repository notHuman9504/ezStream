import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Configure dotenv
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Updated CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 1e7
});

app.use(express.static(path.resolve(__dirname, './public')));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let ffmpegProcess = null;

  const startFFmpeg = (config) => {
    const { rtmpUrl, streamKey, settings } = config;
    const outputUrl = `${rtmpUrl}/${streamKey}`;
    settings.bitrate = 1000000;

    const args = [
      '-analyzeduration', '0',
      '-probesize', '32',
      '-f', 'webm',
      '-i', '-',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', `${settings.bitrate}`,
      '-maxrate', `${settings.bitrate}`,
      '-bufsize', `${settings.bitrate * 2}`,
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-r', `${settings.fps}`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      outputUrl
    ];

    ffmpegProcess = spawn('ffmpeg', args);

    ffmpegProcess.stderr.on('data', (data) => {
      console.log('[FFmpeg]', data.toString());
    });

    ffmpegProcess.on('exit', (code) => {
      console.log(`FFmpeg exited with code ${code}`);
      ffmpegProcess = null;
    });
  };

  socket.on('stream:start', (config) => {
    console.log('Starting stream to:', config.rtmpUrl);
    startFFmpeg(config);
  });

  socket.on('stream:data', (data) => {
    if (ffmpegProcess?.stdin.writable) {
      ffmpegProcess.stdin.write(data, (err) => {
        if (err) console.error('Stream write error:', err);
      });
    }
  });

  socket.on('stream:stop', () => {
    if (ffmpegProcess) {
      ffmpegProcess.stdin.end();
      ffmpegProcess.kill('SIGINT');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (ffmpegProcess) {
      ffmpegProcess.kill('SIGINT');
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});