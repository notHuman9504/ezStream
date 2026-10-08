import React, { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import type { CanvasSource } from "@/types/canvas";
import type { OverlayConfig } from "@/types/overlay";
import {
  AudioMixer,
  computeLayout,
  drawVideoInRect,
  getDrawElement,
  getSupportedMimeType,
  probeHtmlInCanvas,
  startFrameClock,
} from "@/lib/compositor";
import { OverlayState, StreamOverlay, paintOverlayFallback } from "./streamOverlay";

export type StreamStatus =
  | { state: 'idle' }
  | { state: 'starting' }
  | { state: 'live' }
  | { state: 'error'; message: string };

export type OverlayRenderer = 'html' | 'fallback';

type VideoCanvasProps = {
  sources: CanvasSource[];
  overlay: OverlayConfig;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  isStreaming?: boolean;
  streamingSocket?: Socket | null;
  rtmpUrl?: string;
  streamKey?: string;
  onStatusChange?: (status: StreamStatus) => void;
  onRendererChange?: (renderer: OverlayRenderer) => void;
};

const sourceStreams = (sources: CanvasSource[]) =>
  sources
    .map(s => s.video.srcObject)
    .filter((s): s is MediaStream => s instanceof MediaStream);

const VideoCanvas: React.FC<VideoCanvasProps> = ({
  sources,
  overlay,
  width = 1280,
  height = 720,
  fps = 30,
  bitrate = 2_500_000,
  isStreaming = false,
  streamingSocket,
  rtmpUrl,
  streamKey,
  onStatusChange,
  onRendererChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mixerRef = useRef<AudioMixer | null>(null);

  const tiles = useMemo(() => {
    const rects = computeLayout(sources.length, width, height, overlay.layout);
    return sources.map((source, i) => ({ rect: rects[i], label: source.label }));
  }, [sources, width, height, overlay.layout]);

  const overlayState: OverlayState = { config: overlay, width, height, tiles, isLive: isStreaming };

  // The frame loop and the recorder live for a long time; they read the latest
  // props through refs instead of restarting whenever something changes.
  const latest = useRef({ sources, overlayState, rtmpUrl, streamKey, bitrate, onStatusChange });
  latest.current = { sources, overlayState, rtmpUrl, streamKey, bitrate, onStatusChange };

  const [renderer, setRenderer] = useState<OverlayRenderer>('fallback');
  useEffect(() => onRendererChange?.(renderer), [renderer, onRendererChange]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawElement: ReturnType<typeof getDrawElement> = null;
    let cancelled = false;
    probeHtmlInCanvas().then(supported => {
      if (cancelled || !supported) return;
      drawElement = getDrawElement(ctx);
      setRenderer(drawElement ? 'html' : 'fallback');
    });
    const startedAt = performance.now();

    const drawFrame = () => {
      const { sources, overlayState } = latest.current;

      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, width, height);

      if (sources.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `500 ${Math.round(width / 50)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Select streams below to add them to the canvas', width / 2, height / 2);
        ctx.textAlign = 'left';
      }

      overlayState.tiles.forEach(({ rect }, i) => {
        const source = sources[i];
        if (rect && source && source.video.readyState >= 2) {
          drawVideoInRect(ctx, source.video, rect, source.isScreen ? 'contain' : 'cover');
        }
      });

      // drawElementImage throws until the browser has taken the first snapshot
      // of the canvas children, so fall back for that frame.
      let drewHtml = false;
      if (drawElement && overlayRef.current) {
        try {
          drawElement(overlayRef.current, 0, 0, width, height);
          drewHtml = true;
        } catch {
          drewHtml = false;
        }
      }
      if (!drewHtml) paintOverlayFallback(ctx, overlayState, performance.now() - startedAt);
    };

    const stopClock = startFrameClock(fps, drawFrame);
    return () => {
      cancelled = true;
      stopClock();
    };
  }, [width, height, fps]);

  // Keep the audio mix in sync with the selected tiles while live. Tracks can
  // also appear on an existing stream (e.g. a peer unmutes), so re-check periodically.
  useEffect(() => {
    mixerRef.current?.sync(sourceStreams(sources));
  }, [sources]);

  // Streaming
  useEffect(() => {
    if (!isStreaming) return;

    const report = (status: StreamStatus) => latest.current.onStatusChange?.(status);
    const canvas = canvasRef.current;
    const socket = streamingSocket;
    if (!canvas || !socket) {
      report({ state: 'error', message: 'Streaming server is not connected' });
      return;
    }
    const mimeType = getSupportedMimeType();
    if (typeof MediaRecorder === 'undefined' || !mimeType) {
      report({ state: 'error', message: 'This browser cannot record the canvas' });
      return;
    }

    const mixer = new AudioMixer();
    mixerRef.current = mixer;
    mixer.sync(sourceStreams(latest.current.sources));
    void mixer.resume();
    const resync = window.setInterval(() => mixer.sync(sourceStreams(latest.current.sources)), 1000);

    const videoTrack = canvas.captureStream(fps).getVideoTracks()[0];
    const recorder = new MediaRecorder(new MediaStream([videoTrack, mixer.track]), {
      mimeType,
      videoBitsPerSecond: latest.current.bitrate,
      audioBitsPerSecond: 128_000,
    });

    // Not volatile: every chunk is part of one WebM file, and a dropped chunk
    // corrupts the container for ffmpeg.
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket.connected) {
        socket.emit('stream:data', event.data);
      }
    };
    recorder.onerror = (event) => {
      const error = (event as Event & { error?: DOMException }).error;
      report({ state: 'error', message: error?.message || 'Recording failed' });
    };

    // Only record once ffmpeg is running: the first chunk carries the WebM
    // header, and the server drops data that arrives before the process exists.
    const onStarted = () => {
      if (recorder.state === 'inactive') recorder.start(250);
      report({ state: 'live' });
    };
    const onError = (payload: { message?: string } | string) =>
      report({ state: 'error', message: typeof payload === 'string' ? payload : payload?.message || 'Stream failed' });
    const onStopped = (payload?: { code?: number | null }) => {
      if (payload?.code) report({ state: 'error', message: `Encoder exited (code ${payload.code})` });
    };
    const onDisconnect = () => report({ state: 'error', message: 'Lost connection to the streaming server' });

    socket.on('stream:started', onStarted);
    socket.on('stream:error', onError);
    socket.on('stream:stopped', onStopped);
    socket.on('disconnect', onDisconnect);

    report({ state: 'starting' });
    const { rtmpUrl, streamKey, bitrate } = latest.current;
    socket.emit('stream:start', {
      rtmpUrl,
      streamKey,
      settings: { width, height, fps, bitrate },
    });

    return () => {
      socket.off('stream:started', onStarted);
      socket.off('stream:error', onError);
      socket.off('stream:stopped', onStopped);
      socket.off('disconnect', onDisconnect);
      window.clearInterval(resync);
      if (recorder.state !== 'inactive') recorder.stop();
      videoTrack.stop();
      mixer.close();
      mixerRef.current = null;
      socket.emit('stream:stop');
      report({ state: 'idle' });
    };
  }, [isStreaming, streamingSocket, width, height, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-contain"
      // HTML-in-Canvas opt-in (old and new attribute names). It has to be present
      // when the children are first laid out, so it can't be added later.
      {...{ layoutsubtree: '', content: 'drawable' }}
    >
      <StreamOverlay ref={overlayRef} {...overlayState} />
    </canvas>
  );
};

export default VideoCanvas;
