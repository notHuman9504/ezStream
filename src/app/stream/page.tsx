'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from "socket.io-client";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

export default function StreamPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [rtmpUrl, setRtmpUrl] = useState('')
  const [streamKey, setStreamKey] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null);
  const userEmail = useSelector((state: RootState) => state.user.email);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [circle,setCircle] = useState(false);
  
  useEffect(() => {
    if (userEmail === "") {
      router.push('/signin')
    }
  }, [router, userEmail])

  useEffect(() => {
    const socketInstance = io("http://localhost:5000", {
      transports: ['websocket']
   });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to server");
    });


    socketInstance.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  useEffect(() => {
    async function setupWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 45 }
          },
          audio: true 
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
        }
    
        setIsLoading(false)
      } catch (err) {
        console.error('Error accessing webcam:', err)
      }
    }


    setupWebcam()

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(()=>{
    if(isStreaming)
    {
      setIsStreaming(false);
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      if (socket) {
        socket.emit('stopStreaming');
      }
      setTimeout(()=>{
        if(streamRef.current){
          convertToBinary(streamRef.current);
          setIsStreaming(true);
        }
      },500)
    }
  },[circle])

  async function convertToBinary(stream: MediaStream) {
    if(socket){
      socket.emit('startStreaming', { rtmpUrl, streamKey,circle });
    }
    const recorder = new MediaRecorder(stream, {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000
    });

    setMediaRecorder(recorder);

    recorder.ondataavailable = (event) => {
      if(socket){
        console.log("binary",event.data)
        socket.emit('binarystream', event.data);
      }
    }
    recorder.start(45);
  }


  const handleStreamToggle = () => {
    setIsStreaming(!isStreaming);
    if (!isStreaming) {
      console.log('Starting stream with:', { rtmpUrl, streamKey });
      if(streamRef.current){
        convertToBinary(streamRef.current);
      }
    } else {
      console.log('Stopping stream');
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      if (socket) {
        socket.emit('stopStreaming');
      }
    }
  }

  if (isLoading) {
    return <div className="max-w-2xl mx-auto p-6">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Stream Settings</h1>
      <div className="relative aspect-video mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full rounded-lg bg-black"
        />
      </div>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="rtmpUrl" className="block text-sm font-medium mb-1">
            RTMP URL
          </label>
          <input
            id="rtmpUrl"
            type="text"
            value={rtmpUrl}
            onChange={(e) => setRtmpUrl(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="rtmp://your-streaming-service/live"
          />
        </div>

        <div>
          <label htmlFor="streamKey" className="block text-sm font-medium mb-1">
            Stream Key
          </label>
          <input
            id="streamKey"
            type="password"
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter your stream key"
          />
        </div>

        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={circle}
              onChange={(e) => setCircle(e.target.checked)}
              className="form-checkbox h-5 w-5 text-green-500"
            />
            <span className="text-sm font-medium">Show Circle</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleStreamToggle}
          className={`w-full p-3 rounded-md text-white font-medium ${
            isStreaming 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
        </button>
      </form>
    </div>
  )
}

