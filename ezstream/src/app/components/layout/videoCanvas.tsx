import React, { useRef, useEffect } from "react";
import { Socket } from "socket.io-client";

type VideoCanvasProps = {
  videoRefs: HTMLVideoElement[];
  width?: number;
  height?: number;
  isStreaming?: boolean;
  streamingSocket?: Socket | null;
  rtmpUrl?: string;
  streamKey?: string;
  fps?: number;
};

const VideoCanvas: React.FC<VideoCanvasProps> = ({
  videoRefs,
  width = 1280,
  height = 720,
  isStreaming = false,
  streamingSocket,
  rtmpUrl,
  streamKey,
  fps = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioTimerRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      "video/webm;codecs=h264,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  // Audio timer implementation
  const createAudioTimer = (callback: () => void, frequency: number) => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const silenceNode = audioContext.createGain();
    silenceNode.gain.value = 0;
    silenceNode.connect(audioContext.destination);

    let isStopped = false;

    function createOscillator() {
      if (isStopped) return;

      const osc = audioContext.createOscillator();
      osc.onended = () => {
        if (!isStopped) {
          callback();
          createOscillator();
        }
      };
      osc.connect(silenceNode);
      osc.start(0);
      osc.stop(audioContext.currentTime + frequency / 1000);
    }

    createOscillator();

    return () => {
      isStopped = true;
      audioContext.close();
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Improved video grid layout calculations
    const calculateLayout = () => {
      const count = videoRefs.length;

      // Handle special cases for better layouts
      if (count === 0) return { rows: 1, cols: 1 };
      if (count === 1) return { rows: 1, cols: 1 };
      if (count === 2) return { rows: 1, cols: 2 };
      if (count === 3) return { rows: 2, cols: 2, specialCase: "three" };
      if (count === 4) return { rows: 2, cols: 2 };
      if (count === 5 || count === 6) return { rows: 2, cols: 3 };
      if (count === 7 || count === 8) return { rows: 2, cols: 4 };
      if (count === 9) return { rows: 3, cols: 3 };

      // For more than 9 participants, use the square root approach
      const sqrt = Math.sqrt(count);
      const cols = Math.ceil(sqrt);
      const rows = Math.ceil(count / cols);
      return { rows, cols };
    };

    // Improved draw videos function with centered layout
    const drawVideos = () => {
      // Modern dark background
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { rows, cols } = calculateLayout();

      // Reduced padding for tighter layout
      const padding = 8;
      const availableWidth = canvas.width - padding * (cols + 1);
      const availableHeight = canvas.height - padding * (rows + 1);
      const cellWidth = availableWidth / cols;
      const cellHeight = availableHeight / rows;

      // Calculate starting position to center the grid
      const startX =
        (canvas.width - (cols * cellWidth + (cols - 1) * padding)) / 2;
      const startY =
        (canvas.height - (rows * cellHeight + (rows - 1) * padding)) / 2;

      // Draw subtle grid pattern
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 1; i < cols; i++) {
        const x = startX + i * (cellWidth + padding) - padding / 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let i = 1; i < rows; i++) {
        const y = startY + i * (cellHeight + padding) - padding / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      videoRefs.forEach((video, index) => {
        if (video.readyState >= 2) {
          let x = startX;
          let y = startY;
          let currentCellWidth = cellWidth;
          let currentCellHeight = cellHeight;

          if (videoRefs.length === 3) {
            if (index === 0) {
              // First video takes full height in first column
              currentCellWidth = cellWidth;
              currentCellHeight = cellHeight * 2 + padding;
              x = startX;
              y = startY;
            } else {
              // Second and third videos stack in second column
              currentCellWidth = cellWidth;
              currentCellHeight = cellHeight;
              x = startX + cellWidth + padding;
              y = startY + (index - 1) * (cellHeight + padding);
            }
          } else {
            // Normal grid layout for other cases
            const col = index % cols;
            const row = Math.floor(index / cols);
            x = startX + col * (cellWidth + padding);
            y = startY + row * (cellHeight + padding);
          }

          // Add subtle shadow behind each video cell
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;

          // Create clipping region with rounded corners
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, currentCellWidth, currentCellHeight, 8);
          ctx.clip();

          // Draw video
          const videoAspect = video.videoWidth / video.videoHeight;
          const drawHeight = currentCellHeight;
          const drawWidth = currentCellHeight * videoAspect;
          const offsetX = (currentCellWidth - drawWidth) / 2;

          ctx.drawImage(video, x + offsetX, y, drawWidth, drawHeight);

          // Add subtle gradient overlay
          const gradient = ctx.createLinearGradient(
            x,
            y,
            x,
            y + currentCellHeight
          );
          gradient.addColorStop(0, "rgba(0, 0, 0, 0.2)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, currentCellWidth, currentCellHeight);

          ctx.restore();

          // Reset shadow for border
          ctx.shadowColor = "transparent";
          drawBorder(ctx, x, y, currentCellWidth, currentCellHeight);
        }
      });

      drawWatermark(ctx, canvas.width, canvas.height);
    };

    // Start audio timer loop instead of requestAnimationFrame
    const frameInterval = 1000 / fps; // Convert fps to milliseconds
    const stopAudioTimer = createAudioTimer(drawVideos, frameInterval);
    audioTimerRef.current = stopAudioTimer;

    // Cleanup
    return () => {
      if (audioTimerRef.current) {
        audioTimerRef.current();
      }
    };
  }, [videoRefs, width, height, fps]);

  // Streaming logic
  useEffect(() => {
    if (!isStreaming || !streamingSocket) {
      // Clean up when streaming is stopped
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      streamingSocket?.emit("stream:stop");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const startStreaming = async () => {
      try {
        // Only create new stream if one doesn't exist
        if (!streamRef.current) {
          const stream = canvas.captureStream(fps);
          streamRef.current = stream;
        }

        // Handle audio tracks more carefully
        const stream = streamRef.current;
        const newAudioTracks: MediaStreamTrack[] = [];

        // Create all new tracks first
        videoRefs.forEach((video) => {
          const audioTracks =
            (video.srcObject as MediaStream)?.getAudioTracks() || [];
          audioTracks.forEach((track) => {
            newAudioTracks.push(track.clone());
          });
        });

        // Stop the MediaRecorder temporarily if it's active
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.pause();
        }

        // Create a new MediaStream with the video track
        const videoTrack = stream.getVideoTracks()[0];
        const newStream = new MediaStream([videoTrack]);

        // Add all new audio tracks to the new stream
        newAudioTracks.forEach((track) => {
          newStream.addTrack(track);
        });

        // Replace the old stream with the new one
        streamRef.current = newStream;

        // Create new MediaRecorder with the new stream
        if (
          !mediaRecorderRef.current ||
          mediaRecorderRef.current.state === "inactive"
        ) {
          const mimeType = getSupportedMimeType();
          if (!mimeType) {
            throw new Error("No supported video codec found");
          }

          const mediaRecorder = new MediaRecorder(newStream, {
            mimeType,
            videoBitsPerSecond: 3000000,
            audioBitsPerSecond: 128000,
          });

          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && streamingSocket.connected) {
              streamingSocket.volatile.emit("stream:data", event.data);
            }
          };

          mediaRecorder.onerror = (event: Event) => {
            const error = (event as any).error;
            console.error("MediaRecorder error:", {
              message: error?.message,
              name: error?.name,
            });

            // Only restart if it's not a fatal error
            if (error?.name !== "InvalidStateError") {
              restartStream();
            }
          };

          mediaRecorder.start(100); // 100ms chunks

          // Only emit stream:start when starting a new stream
          streamingSocket.emit("stream:start", {
            rtmpUrl,
            streamKey,
            settings: {
              width,
              height,
              fps,
              bitrate: 3000000,
            },
          });
        } else if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
      } catch (error) {
        console.error("Stream setup error:", error);
      }
    };

    const restartStream = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setTimeout(startStreaming, 1000);
      }
    };

    startStreaming();

    return () => {
      // Cleanup will happen at the start of next effect run
    };
  }, [
    isStreaming,
    streamingSocket,
    rtmpUrl,
    streamKey,
    fps,
    width,
    height,
    videoRefs,
  ]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

// Update border style to remove it completely
const drawBorder = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  // Empty function - no border will be drawn
};

// Update watermark for better visibility
const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => {
  // Add shadow for better visibility
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // More visible watermark
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "700 18px Inter, system-ui, -apple-system, sans-serif";
  ctx.fillText("ezStream", width - 100, height - 20);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
};

export default VideoCanvas;
