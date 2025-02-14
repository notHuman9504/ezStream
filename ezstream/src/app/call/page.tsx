import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';

const socketRef = useRef<Socket | null>(null);

useEffect(() => {
  socketRef.current = io(process.env.NEXT_PUBLIC_CALLING_SERVER_URL!, {
    withCredentials: true
  });
  // ... rest of the socket logic
}, []); 