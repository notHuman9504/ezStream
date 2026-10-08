/*
 * ezStream RTMP relay.
 *
 * The browser composites everything (video, overlays, mixed audio) and records
 * it with MediaRecorder (WebM, vp8/vp9/h264 + opus). Each recorded chunk is sent
 * over socket.io; this server pipes the chunks into ffmpeg, which transcodes to
 * H.264/AAC FLV and pushes to `${rtmpUrl}/${streamKey}`. No filtering is done.
 *
 * Socket events, client -> server
 *   stream:start  {
 *     rtmpUrl:   string,   // rtmp:// or rtmps:// only, max 512 chars
 *     streamKey: string,   // 1-256 chars, no whitespace, no "..", no leading "/"
 *     settings?: {         // all optional, clamped to the ranges below
 *       width?:   number,  // even integer 160-1920 (informational, no scaling)
 *       height?:  number,  // even integer 90-1080  (informational, no scaling)
 *       fps?:     number,  // 1-60, default 30
 *       bitrate?: number   // video bits/s, 500000-8000000, default 2500000
 *     }
 *   }
 *     Starting again on the same socket stops the previous stream first.
 *   stream:data   Buffer | ArrayBuffer | Uint8Array   // one MediaRecorder chunk
 *     Dropped if no stream is running.
 *   stream:stop   (no payload)
 *
 * Socket events, server -> client
 *   stream:started { rtmpUrl, settings: { width, height, fps, bitrate } }
 *   stream:stopped { code: number | null }   // ffmpeg exit code (null if killed by signal)
 *   stream:error   { message: string }
 *   stream:stats   { frame, fps, bitrate, speed, time }   // about every 5 s while live
 *
 * HTTP
 *   GET /health -> { ok: true, streams: <number of running ffmpeg processes> }
 *
 * Env: PORT (default 5000), CORS_ORIGIN (comma-separated list),
 *      MAX_STREAMS (default 10), WALLCLOCK_TIMESTAMPS=1 (ffmpeg
 *      -use_wallclock_as_timestamps on input; off by default).
 */
import dotenv from 'dotenv';
import http from 'http';
import { spawn } from 'child_process';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';

// Configure dotenv
dotenv.config();

const PORT = process.env.PORT || 5000;
const MAX_STREAMS = Math.max(1, parseInt(process.env.MAX_STREAMS, 10) || 10);

const WALLCLOCK_TIMESTAMPS = process.env.WALLCLOCK_TIMESTAMPS === '1';

const MAX_RTMP_URL_LENGTH = 512;
const MAX_STREAM_KEY_LENGTH = 256;
const MAX_BUFFERED_BYTES = 32 * 1024 * 1024; // stdin backlog before we give up
const STDIN_GRACE_MS = 1500; // after stdin.end(), wait before SIGINT
const KILL_TIMEOUT_MS = 5000; // after stop begins, SIGKILL if still alive
const STATS_INTERVAL_MS = 5000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: corsOrigins,
  methods: ['GET', 'POST'],
  credentials: true
};

const app = express();
const server = http.createServer(app);

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e7
});

// All running ffmpeg processes (including ones that are shutting down).
const activeProcesses = new Set();

app.get('/health', (req, res) => {
  res.json({ ok: true, streams: activeProcesses.size });
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const clampEven = (value, min, max, fallback) => {
  const n = Math.round(clamp(value, min, max, fallback));
  return n % 2 === 0 ? n : n - 1;
};

const normalizeSettings = (settings) => {
  const s = settings && typeof settings === 'object' ? settings : {};
  return {
    width: clampEven(s.width, 160, 1920, 1280),
    height: clampEven(s.height, 90, 1080, 720),
    fps: Math.round(clamp(s.fps, 1, 60, 30)),
    bitrate: Math.round(clamp(s.bitrate, 500_000, 8_000_000, 2_500_000))
  };
};

// Returns { outputUrl, settings } or { error }.
const validateConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return { error: 'Invalid stream configuration' };
  }
  const { rtmpUrl, streamKey } = config;

  if (typeof rtmpUrl !== 'string' || !rtmpUrl.trim()) {
    return { error: 'rtmpUrl is required' };
  }
  const baseUrl = rtmpUrl.trim();
  if (baseUrl.length > MAX_RTMP_URL_LENGTH) {
    return { error: 'rtmpUrl is too long' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\s\x00-\x1f\x7f\\]/.test(baseUrl)) {
    return { error: 'rtmpUrl contains invalid characters' };
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { error: 'rtmpUrl is not a valid URL' };
  }
  if (parsed.protocol !== 'rtmp:' && parsed.protocol !== 'rtmps:') {
    return { error: 'rtmpUrl must start with rtmp:// or rtmps://' };
  }
  if (!parsed.hostname) {
    return { error: 'rtmpUrl must include a host' };
  }

  if (typeof streamKey !== 'string' || !streamKey) {
    return { error: 'streamKey is required' };
  }
  if (streamKey.length > MAX_STREAM_KEY_LENGTH) {
    return { error: 'streamKey is too long' };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\s\x00-\x1f\x7f\\]/.test(streamKey)) {
    return { error: 'streamKey must not contain whitespace or control characters' };
  }
  if (streamKey.startsWith('/') || streamKey.includes('..')) {
    return { error: 'streamKey is invalid' };
  }

  return {
    rtmpUrl: baseUrl.replace(/\/+$/, ''),
    outputUrl: `${baseUrl.replace(/\/+$/, '')}/${streamKey}`,
    settings: normalizeSettings(config.settings)
  };
};

const buildFfmpegArgs = (outputUrl, { fps, bitrate }) => [
  '-hide_banner',
  '-loglevel', 'warning',
  '-stats',
  '-stats_period', '5',
  // Input: live WebM from MediaRecorder with unreliable timestamps.
  '-protocol_whitelist', 'pipe',
  '-fflags', '+genpts',
  // Wallclock stamping is opt-in: it made bursty Opus packets non-monotonic
  // (AAC "Queue input is backward in time") and dropped video frames in tests.
  ...(WALLCLOCK_TIMESTAMPS ? ['-use_wallclock_as_timestamps', '1'] : []),
  '-probesize', '1M',
  '-analyzeduration', '1M',
  '-f', 'webm',
  '-i', 'pipe:0',
  // Video
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-tune', 'zerolatency',
  '-pix_fmt', 'yuv420p',
  '-r', `${fps}`,
  '-fps_mode', 'cfr',
  '-b:v', `${bitrate}`,
  '-maxrate', `${bitrate}`,
  '-bufsize', `${bitrate * 2}`,
  '-g', `${fps * 2}`,
  '-keyint_min', `${fps * 2}`,
  '-sc_threshold', '0',
  // Audio
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '44100',
  '-ac', '2',
  // Output
  '-protocol_whitelist', 'rtmp,rtmps,tcp,tls,crypto',
  '-f', 'flv',
  '-flvflags', 'no_duration_filesize',
  outputUrl
];

const toBuffer = (data) => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
};

const parseStatsLine = (line) => {
  const stats = {};
  for (const match of line.matchAll(/(\w+)=\s*(\S+)/g)) {
    stats[match[1]] = match[2];
  }
  return {
    frame: stats.frame,
    fps: stats.fps,
    bitrate: stats.bitrate,
    speed: stats.speed,
    time: stats.time
  };
};

io.on('connection', (socket) => {
  const log = (...args) => console.log(`[${socket.id}]`, ...args);
  const logError = (...args) => console.error(`[${socket.id}]`, ...args);
  log('Client connected');

  // Current stream entry for this socket: { proc, stopping, exited, stopPromise }
  let current = null;
  let startToken = 0;

  const safeEmit = (event, payload) => {
    if (socket.connected) socket.emit(event, payload);
  };

  // Stops an entry: stdin.end(), SIGINT, then SIGKILL. Resolves once the
  // process has exited. Safe to call multiple times.
  const stopEntry = (entry) => {
    if (entry.exited) return Promise.resolve();
    if (entry.stopPromise) return entry.stopPromise;
    entry.stopping = true;

    entry.stopPromise = new Promise((resolve) => {
      entry.proc.once('close', resolve);
      if (entry.exited) return resolve();

      try {
        entry.proc.stdin.end();
      } catch (err) {
        logError('stdin.end failed:', err.message);
      }
      const sigintTimer = setTimeout(() => {
        if (!entry.exited) entry.proc.kill('SIGINT');
      }, STDIN_GRACE_MS);
      const sigkillTimer = setTimeout(() => {
        if (!entry.exited) {
          log('ffmpeg did not exit, sending SIGKILL');
          entry.proc.kill('SIGKILL');
        }
      }, KILL_TIMEOUT_MS);
      entry.proc.once('close', () => {
        clearTimeout(sigintTimer);
        clearTimeout(sigkillTimer);
      });
    });
    return entry.stopPromise;
  };

  const launch = (outputUrl, rtmpUrl, settings) => {
    const args = buildFfmpegArgs(outputUrl, settings);
    log(`Starting ffmpeg -> ${rtmpUrl}/<key> (${settings.width}x${settings.height} ${settings.fps}fps ${settings.bitrate}bps)`);

    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    const entry = { proc, stopping: false, exited: false, stopPromise: null, reportedError: false };
    current = entry;
    activeProcesses.add(proc);

    const failStream = (message) => {
      if (entry.reportedError) return;
      entry.reportedError = true;
      logError('Stream error:', message);
      safeEmit('stream:error', { message });
    };
    entry.fail = failStream;

    proc.on('spawn', () => {
      safeEmit('stream:started', { rtmpUrl, settings });
    });

    // Never let a broken pipe (ffmpeg died) crash the server.
    proc.stdin.on('error', (err) => {
      if (err.code !== 'EPIPE' && err.code !== 'ERR_STREAM_DESTROYED') {
        logError('ffmpeg stdin error:', err.message);
      }
    });

    let stderrBuf = '';
    let lastStatsAt = 0;
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split(/[\r\n]+/);
      stderrBuf = lines.pop();
      if (stderrBuf.length > 8192) stderrBuf = stderrBuf.slice(-8192);
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith('frame=') || /^\s*size=/.test(line)) {
          const now = Date.now();
          if (now - lastStatsAt >= STATS_INTERVAL_MS - 250) {
            lastStatsAt = now;
            safeEmit('stream:stats', parseStatsLine(line));
          }
        } else {
          log('[ffmpeg]', line);
        }
      }
    });

    proc.on('error', (err) => {
      // spawn failure (e.g. ffmpeg not installed) or kill failure
      failStream(err.code === 'ENOENT' ? 'ffmpeg is not installed on the server' : `ffmpeg error: ${err.message}`);
    });

    proc.on('close', (code, signal) => {
      entry.exited = true;
      activeProcesses.delete(proc);
      if (current === entry) current = null;
      log(`ffmpeg exited (code=${code}, signal=${signal})`);
      if (!entry.stopping && code !== 0) {
        failStream(`ffmpeg exited unexpectedly (code ${code ?? signal})`);
      }
      safeEmit('stream:stopped', { code: code ?? null });
    });

    return entry;
  };

  socket.on('stream:start', async (config) => {
    const token = ++startToken;
    const result = validateConfig(config);
    if (result.error) {
      logError('Rejected stream:start:', result.error);
      safeEmit('stream:error', { message: result.error });
      return;
    }

    if (current) {
      await stopEntry(current);
      // A newer stream:start or a disconnect happened while waiting.
      if (token !== startToken || !socket.connected) return;
    }

    if (activeProcesses.size >= MAX_STREAMS) {
      safeEmit('stream:error', { message: 'Server is at capacity, try again later' });
      return;
    }

    launch(result.outputUrl, result.rtmpUrl, result.settings);
  });

  socket.on('stream:data', (data) => {
    const entry = current;
    if (!entry || entry.stopping || entry.exited) return;
    const stdin = entry.proc.stdin;
    if (!stdin.writable) return;

    const buf = toBuffer(data);
    if (!buf || buf.length === 0) return;

    stdin.write(buf);
    // write() === false means ffmpeg is behind. WebM chunks cannot be dropped
    // without corrupting the container, so keep buffering up to a limit.
    if (stdin.writableLength > MAX_BUFFERED_BYTES) {
      entry.fail('server overloaded');
      stopEntry(entry);
    }
  });

  socket.on('stream:stop', () => {
    if (current) {
      startToken++;
      stopEntry(current);
    }
  });

  socket.on('disconnect', () => {
    log('Client disconnected');
    startToken++;
    if (current) stopEntry(current);
  });
});

const shutdown = () => {
  for (const proc of activeProcesses) {
    try {
      proc.stdin.end();
      proc.kill('SIGINT');
    } catch {
      // already gone
    }
  }
  setTimeout(() => process.exit(0), 1500).unref();
  server.close();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
