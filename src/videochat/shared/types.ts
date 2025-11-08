export interface Participant {
  id: string;
  roomId: string;
  name: string;
  joinedAt: number;
  isPublishing: boolean;
  streams: {
    video: boolean;
    audio: boolean;
  };
}

export interface Room {
  id: string;
  name: string;
  participants: Map<string, Participant>;
  createdAt: number;
  isLivestreaming: boolean;
  livestreamKey?: string;
}

export interface MediaChunk {
  participantId: string;
  roomId: string;
  type: 'video' | 'audio';
  data: Buffer | Uint8Array;
  timestamp: number;
  sequence: number;
  isKeyframe?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: number;
}

export interface SignalingMessage {
  type: SignalingMessageType;
  roomId: string;
  participantId: string;
  targetParticipantId?: string;
  data?: any;
}

export enum SignalingMessageType {
  // Room management
  JOIN = 'join',
  LEAVE = 'leave',
  ROOM_STATE = 'room-state',
  
  // WebRTC signaling
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  
  // Media control
  START_PUBLISH = 'start-publish',
  STOP_PUBLISH = 'stop-publish',
  MEDIA_CHUNK = 'media-chunk',
  REQUEST_KEYFRAME = 'request-keyframe',
  
  // Chat
  CHAT_MESSAGE = 'chat-message',
  CHAT_HISTORY = 'chat-history',
  
  // Streaming
  START_LIVESTREAM = 'start-livestream',
  STOP_LIVESTREAM = 'stop-livestream',
  
  // System
  ERROR = 'error',
  PARTICIPANT_JOINED = 'participant-joined',
  PARTICIPANT_LEFT = 'participant-left'
}

export interface WebRTCOffer {
  sdp: string;
  type: 'offer';
}

export interface WebRTCAnswer {
  sdp: string;
  type: 'answer';
}

export interface ICECandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}

export interface BandwidthStats {
  participantId: string;
  upstream: number; // Kbps
  downstream: number; // Kbps
  packetLoss: number; // percentage
  latency: number; // ms
  timestamp: number;
}

export interface StreamQuality {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}