export interface WebRTCMessage {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
    streamKey?: string;
}

export interface StreamConfig {
    rtmpUrl: string;
    streamKey: string;
}