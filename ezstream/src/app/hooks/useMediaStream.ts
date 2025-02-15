import { useState, useRef, useEffect } from 'react';

interface UseMediaStreamProps {
  onStreamChange?: (stream: MediaStream) => void;
}

export const useMediaStream = ({ onStreamChange }: UseMediaStreamProps = {}) => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const initializeLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      onStreamChange?.(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      return null;
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      }
      setIsScreenSharing(!isScreenSharing);
      return screenStreamRef.current;
    } catch (err) {
      console.error('Error toggling screen share:', err);
      return null;
    }
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    localStreamRef,
    screenStreamRef,
    isScreenSharing,
    initializeLocalStream,
    toggleScreenShare,
  };
}; 