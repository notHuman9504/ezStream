import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseSocketConnectionProps {
  url: string;
  options?: any;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useSocketConnection = ({
  url,
  options = {},
  onConnect,
  onDisconnect,
  onError,
}: UseSocketConnectionProps) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(url, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      ...options,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      onConnect?.();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      onError?.(error);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      onDisconnect?.();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [url]);

  return socketRef;
}; 