const userVideo = document.getElementById('user-video');
const startButton = document.getElementById('start-btn');
const showStreamKeyCheckbox = document.getElementById('show-stream-key');
const streamKeyInput = document.getElementById('stream-key');
const rtmpUrlInput = document.getElementById('rtmp-url');
const statusIndicator = document.getElementById('status-indicator');

const state = {
  media: null,
  streaming: false,
  mediaRecorder: null
};

const socket = io();

startButton.addEventListener('click', () => {
  if (state.streaming) {
    stopStreaming();
  } else {
    startStreaming();
  }
});

showStreamKeyCheckbox.addEventListener('change', (event) => {
  streamKeyInput.type = event.target.checked ? 'text' : 'password';
});

async function startStreaming() {
  const rtmpUrl = rtmpUrlInput.value;
  const streamKey = streamKeyInput.value;

  if (!rtmpUrl || !streamKey) {
    alert('Please enter both RTMP URL and Stream Key!');
    return;
  }

  startButton.disabled = true;
  rtmpUrlInput.disabled = true;
  streamKeyInput.disabled = true;

  socket.emit('startStreaming', { rtmpUrl, streamKey });

  const mediaRecorder = new MediaRecorder(state.media, {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 2500000,
    framerate: 25,
  });

  mediaRecorder.ondataavailable = (ev) => {
    socket.emit('binarystream', ev.data);
  };

  mediaRecorder.start(25);

  startButton.textContent = 'Stop Streaming';
  startButton.disabled = false;
  state.streaming = true;
  state.mediaRecorder = mediaRecorder;
  updateStatus(true);
}

function stopStreaming() {
  if (state.mediaRecorder) {
    state.mediaRecorder.stop();
    socket.emit('stopStreaming');
  }

  startButton.textContent = 'Start Streaming';
  startButton.disabled = false;
  rtmpUrlInput.disabled = false;
  streamKeyInput.disabled = false;
  state.streaming = false;
  updateStatus(false);
}

function updateStatus(isStreaming) {
  statusIndicator.textContent = isStreaming ? 'Streaming' : '';
  statusIndicator.classList.toggle('streaming', isStreaming);
}

window.addEventListener('load', async () => {
  try {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    state.media = media;
    userVideo.srcObject = media;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    alert('Unable to access camera and microphone. Please make sure they are connected and you have granted the necessary permissions.');
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  if (state.streaming) {
    stopStreaming();
  }
});

socket.on('streamingError', (error) => {
  console.error('Streaming error:', error);
  alert(`Streaming error: ${error}`);
  stopStreaming();
});