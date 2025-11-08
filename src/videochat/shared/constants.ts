export const MEDIA_CONSTRAINTS = {
  video: {
    width: 320,
    height: 240,
    frameRate: 15
  },
  audio: {
    sampleRate: 48000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 16384, // 16KB
  VIDEO_CHUNK_INTERVAL: 66, // ~15fps
  AUDIO_CHUNK_INTERVAL: 20, // 20ms audio frames
  MAX_BUFFER_SIZE: 1024 * 1024 * 2 // 2MB buffer
};

export const CODEC_CONFIG = {
  video: {
    mimeType: 'video/vp8',
    clockRate: 90000
  },
  audio: {
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 1
  }
};

export const LIMITS = {
  MAX_PARTICIPANTS: 15,
  MAX_ROOMS: 100,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_CHAT_HISTORY: 100,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  PARTICIPANT_TIMEOUT: 60000 // 60 seconds
};

export const REDIS_KEYS = {
  ROOM_PREFIX: 'room:',
  PARTICIPANT_PREFIX: 'participant:',
  MEDIA_CHANNEL: 'media:',
  CHAT_CHANNEL: 'chat:',
  SIGNALING_CHANNEL: 'signaling:'
};