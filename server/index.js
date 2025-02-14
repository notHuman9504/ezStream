import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';
import { Server as SocketIO } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.static(path.resolve('./public')));

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

server.listen(5000, () => {
  console.log('Signaling server running on port 5000');
});