import React, { useRef, useEffect } from 'react';
import io from 'socket.io-client';

const socketRef = useRef<Socket | null>(null);

useEffect(() => {
  socketRef.current = io('https://ezstream-calling-server.onrender.com', {
    withCredentials: true
  });
  // ... rest of the socket logic
}, []); 