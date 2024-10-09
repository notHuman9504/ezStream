import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';
import { Server as SocketIO } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

let ffmpegProcess = null;

app.use(express.static(path.resolve('./public')));

io.on('connection', (socket) => {
  console.log('Socket Connected', socket.id);

  socket.on('startStreaming', ({ rtmpUrl, streamKey }) => {
    const fullRTMPUrl = `${rtmpUrl}/${streamKey}`;

    const options = [
      '-i',
      '-',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-r', `${25}`,
      '-g', `${25 * 2}`,
      '-keyint_min', 25,
      '-crf', '25',
      '-pix_fmt', 'yuv420p',
      '-sc_threshold', '0',
      '-profile:v', 'main',
      '-level', '3.1',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', 128000 / 4,
      '-f', 'flv',
      fullRTMPUrl,
    ];

    ffmpegProcess = spawn('ffmpeg', options);

    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
    });
  });

  socket.on('binarystream', (stream) => {
    if (ffmpegProcess) {
      ffmpegProcess.stdin.write(stream, (err) => {
        if (err) {
          console.error('Error writing to ffmpeg:', err);
        }
      });
    }
  });

  socket.on('stopStreaming', () => {
    if (ffmpegProcess) {
      ffmpegProcess.stdin.end();
      ffmpegProcess.kill('SIGINT');
      console.log('Streaming stopped.');
      ffmpegProcess = null;
    }
  });

  socket.on('disconnect', () => {
    if (ffmpegProcess) {
      ffmpegProcess.stdin.end();
      ffmpegProcess.kill('SIGINT');
    }
  });
});

server.listen(3000, () => console.log(`HTTP Server is running on PORT 3000`));