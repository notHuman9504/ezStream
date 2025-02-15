export interface Participant {
  userId: string;
  streams: MediaStream[];
  isLocal: boolean;
}

export interface VideoCanvasProps {
  videoRefs: HTMLVideoElement[];
  isStreaming: boolean;
  streamingSocket: any;
  rtmpUrl: string;
  streamKey: string;
  width: number;
  height: number;
  fps: number;
} 