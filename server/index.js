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
  let ffmpegProcess = null;
  let isStreamEnding = false;

  socket.on('join',(room)=>{
    socket.join(room)
    console.log(socket.id,"joined")
  })

  socket.on('startStreaming', ({ rtmpUrl, streamKey }) => {
    const fullRTMPUrl = `${rtmpUrl}/${streamKey}`;
    console.log('Starting stream to:', fullRTMPUrl);
    isStreamEnding = false;
    
    const options = [
      '-i',
      '-',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-r', '30',
      '-g', '60',
      '-keyint_min', '30',
      '-crf', '25',
      '-pix_fmt', 'yuv420p',
      '-sc_threshold', '0',
      '-profile:v', 'main',
      '-level', '3.1',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      fullRTMPUrl,
    ];

    ffmpegProcess = spawn('ffmpeg', options);

    // Handle FFmpeg process errors
    ffmpegProcess.on('error', (error) => {
      console.error('FFmpeg process error:', error);
    });

    // Handle stdin errors
    ffmpegProcess.stdin.on('error', (error) => {
      if (!isStreamEnding || error.code !== 'EOF') {
        console.error('FFmpeg stdin error:', error);
      }
    });

    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
      ffmpegProcess = null;
    });
  });

  socket.on('binarystream', (stream) => {
    try {
      if (ffmpegProcess && ffmpegProcess.stdin.writable && !isStreamEnding) {
        ffmpegProcess.stdin.write(stream, (err) => {
          if (err && err.code !== 'EOF') {
            console.error('Error writing to ffmpeg:', err);
          }
        });
      }
    } catch (error) {
      console.error('Error in binarystream:', error);
    }
  });

  const cleanupFFmpeg = () => {
    try {
      if (ffmpegProcess) {
        isStreamEnding = true;
        console.log('Stopping stream gracefully...');
        
        // End stdin stream first
        if (ffmpegProcess.stdin) {
          ffmpegProcess.stdin.end();
        }

        // Give FFmpeg a moment to process remaining data
        setTimeout(() => {
          if (ffmpegProcess) {
            ffmpegProcess.kill('SIGTERM');
            ffmpegProcess = null;
            console.log('Stream stopped successfully');
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  socket.on('stopStreaming', cleanupFFmpeg);
  socket.on('disconnect', cleanupFFmpeg);
});

server.listen(5000, () => console.log(`HTTP Server is running on PORT 5000`));