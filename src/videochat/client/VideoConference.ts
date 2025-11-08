import { SignalingClient } from './SignalingClient';
import { MediaHandler } from './MediaHandler';
import { WebRTCManager } from './WebRTCManager';
import { ChunkHandler } from './ChunkHandler';
import { ChatClient } from './ChatClient';
import { SignalingMessageType, Participant } from '../shared/types';
import { Protocol } from '../shared/protocol';
import { CHUNK_CONFIG } from '../shared/constants';

export interface VideoConferenceConfig {
  serverUrl: string;
  roomId: string;
  participantName: string;
}

export class VideoConference {
  private signalingClient: SignalingClient;
  private mediaHandler: MediaHandler;
  private webrtcManager: WebRTCManager;
  private chunkHandler: ChunkHandler;
  private chatClient: ChatClient | null = null;
  
  private roomId: string;
  private participantId: string | null = null;
  private participantName: string;
  private participants: Map<string, Participant> = new Map();
  
  private isPublishing: boolean = false;
  private videoInterval: number | null = null;
  private audioInterval: number | null = null;

  private onParticipantJoinedCallbacks: ((participant: Participant) => void)[] = [];
  private onParticipantLeftCallbacks: ((participantId: string) => void)[] = [];
  private onRemoteStreamCallbacks: ((participantId: string, stream: MediaStream) => void)[] = [];
  private onErrorCallbacks: ((error: Error) => void)[] = [];

  constructor(config: VideoConferenceConfig) {
    this.roomId = config.roomId;
    this.participantName = config.participantName;
    
    this.signalingClient = new SignalingClient(config.serverUrl);
    this.mediaHandler = new MediaHandler();
    this.webrtcManager = new WebRTCManager();
    this.chunkHandler = new ChunkHandler();
  }

  async join(): Promise<void> {
    try {
      // Connect to signaling server
      await this.signalingClient.connect();
      
      // Setup signaling listeners
      this.setupSignalingListeners();

      // Send join message
      const joinMessage = Protocol.createMessage(
        SignalingMessageType.JOIN,
        this.roomId,
        'temp', // Will be assigned by server
        { participantName: this.participantName }
      );

      this.signalingClient.send(joinMessage);

      console.log('Joining room...');
    } catch (error) {
      console.error('Error joining room:', error);
      this.onErrorCallbacks.forEach(cb => cb(error as Error));
      throw error;
    }
  }

  private setupSignalingListeners() {
    // Room state received
    this.signalingClient.on(SignalingMessageType.ROOM_STATE, (data) => {
      console.log('Room state received:', data);
      this.participantId = data.participantId;
      
      // Initialize chat client
      if (this.participantId) {
        this.chatClient = new ChatClient(
          this.signalingClient,
          this.roomId,
          this.participantId
        );
      }

      // Store existing participants
      if (data.data && data.data.participants) {
        data.data.participants.forEach((p: Participant) => {
          if (p.id !== this.participantId) {
            this.participants.set(p.id, p);
          }
        });
      }
    });

    // Participant joined
    this.signalingClient.on(SignalingMessageType.PARTICIPANT_JOINED, (data) => {
      const participant: Participant = data.data.participant;
      console.log('Participant joined:', participant);
      
      this.participants.set(participant.id, participant);
      this.onParticipantJoinedCallbacks.forEach(cb => cb(participant));
    });

    // Participant left
    this.signalingClient.on(SignalingMessageType.PARTICIPANT_LEFT, (data) => {
      const participantId = data.participantId;
      console.log('Participant left:', participantId);
      
      this.participants.delete(participantId);
      this.webrtcManager.closePeerConnection(participantId);
      this.onParticipantLeftCallbacks.forEach(cb => cb(participantId));
    });

    // WebRTC signaling
    this.signalingClient.on(SignalingMessageType.OFFER, async (data) => {
      await this.handleOffer(data);
    });

    this.signalingClient.on(SignalingMessageType.ANSWER, async (data) => {
      await this.handleAnswer(data);
    });

    this.signalingClient.on(SignalingMessageType.ICE_CANDIDATE, async (data) => {
      await this.handleIceCandidate(data);
    });

    // Media chunks
    this.signalingClient.on(SignalingMessageType.MEDIA_CHUNK, (data) => {
      this.handleMediaChunk(data.data);
    });

    // Error
    this.signalingClient.on(SignalingMessageType.ERROR, (data) => {
      const error = new Error(data.data.message);
      console.error('Server error:', error);
      this.onErrorCallbacks.forEach(cb => cb(error));
    });

    // WebRTC callbacks
    this.webrtcManager.onTrack((participantId, stream) => {
      console.log('Remote stream received from:', participantId);
      this.onRemoteStreamCallbacks.forEach(cb => cb(participantId, stream));
    });

    this.webrtcManager.onIceCandidate((participantId, candidate) => {
      const message = Protocol.createMessage(
        SignalingMessageType.ICE_CANDIDATE,
        this.roomId,
        this.participantId!,
        { candidate },
        participantId
      );
      this.signalingClient.send(message);
    });
  }

  private async handleOffer(data: any) {
    const fromParticipantId = data.participantId;
    const offer = data.data.offer;

    await this.webrtcManager.handleOffer(fromParticipantId, offer);
    const answer = await this.webrtcManager.createAnswer(fromParticipantId);

    const message = Protocol.createMessage(
      SignalingMessageType.ANSWER,
      this.roomId,
      this.participantId!,
      { answer },
      fromParticipantId
    );

    this.signalingClient.send(message);
  }

  private async handleAnswer(data: any) {
    const fromParticipantId = data.participantId;
    const answer = data.data.answer;

    await this.webrtcManager.handleAnswer(fromParticipantId, answer);
  }

  private async handleIceCandidate(data: any) {
    const fromParticipantId = data.participantId;
    const candidate = data.data.candidate;

    await this.webrtcManager.addIceCandidate(fromParticipantId, candidate);
  }

  private handleMediaChunk(data: ArrayBuffer) {
    try {
      const { metadata, chunk } = this.chunkHandler.decodeChunk(data);
      
      // Process video/audio chunk and render
      // This is where you'd decode and render the media
      console.log(`Received ${metadata.type} chunk from ${metadata.participantId}`);
    } catch (error) {
      console.error('Error handling media chunk:', error);
    }
  }

  async startPublishing(): Promise<void> {
    if (this.isPublishing) {
      console.warn('Already publishing');
      return;
    }

    try {
      // Start media capture
      await this.mediaHandler.startCapture();
      this.isPublishing = true;

      // Notify server
      const message = Protocol.createMessage(
        SignalingMessageType.START_PUBLISH,
        this.roomId,
        this.participantId!
      );
      this.signalingClient.send(message);

      // Start sending video chunks
      this.videoInterval = window.setInterval(() => {
        this.sendVideoChunk();
      }, CHUNK_CONFIG.VIDEO_CHUNK_INTERVAL);

      // Start sending audio chunks
      this.audioInterval = window.setInterval(() => {
        this.sendAudioChunk();
      }, CHUNK_CONFIG.AUDIO_CHUNK_INTERVAL);

      console.log('Started publishing');
    } catch (error) {console.error('Error starting publishing:', error);
this.onErrorCallbacks.forEach(cb => cb(error as Error));
throw error;
}
}
stopPublishing(): void {
if (!this.isPublishing) {
console.warn('Not publishing');
return;
}
if (this.videoInterval) {
  clearInterval(this.videoInterval);
  this.videoInterval = null;
}

if (this.audioInterval) {
  clearInterval(this.audioInterval);
  this.audioInterval = null;
}

// Stop media capture
this.mediaHandler.stopCapture();
this.isPublishing = false;

// Notify server
const message = Protocol.createMessage(
  SignalingMessageType.STOP_PUBLISH,
  this.roomId,
  this.participantId!
);
this.signalingClient.send(message);

console.log('Stopped publishing');
}
private sendVideoChunk() {
if (!this.isPublishing || !this.participantId) return;
const frameData = this.mediaHandler.captureVideoFrame();
if (!frameData) return;

const chunk = this.chunkHandler.createVideoChunk(
  this.participantId,
  this.roomId,
  frameData,
  false // isKeyframe - implement keyframe logic as needed
);

this.signalingClient.sendBinary(chunk.buffer as ArrayBuffer );
}
private async sendAudioChunk() {
if (!this.isPublishing || !this.participantId) return;
const audioData = await this.mediaHandler.captureAudioData();
if (!audioData) return;

const chunk = this.chunkHandler.createAudioChunk(
  this.participantId,
  this.roomId,
  audioData
);

this.signalingClient.sendBinary(chunk.buffer as ArrayBuffer);
}
toggleVideo(enabled: boolean): void {
this.mediaHandler.toggleVideo(enabled);
}
toggleAudio(enabled: boolean): void {
this.mediaHandler.toggleAudio(enabled);
}
isVideoEnabled(): boolean {
return this.mediaHandler.isVideoEnabled();
}
isAudioEnabled(): boolean {
return this.mediaHandler.isAudioEnabled();
}
getLocalStream(): MediaStream | null {
return this.mediaHandler.getLocalStream();
}
getRemoteStream(participantId: string): MediaStream | undefined {
return this.webrtcManager.getRemoteStream(participantId);
}
getParticipants(): Participant[] {
return Array.from(this.participants.values());
}
getChatClient(): ChatClient | null {
return this.chatClient;
}
async switchCamera(deviceId?: string): Promise<void> {
await this.mediaHandler.switchCamera(deviceId);
}
static async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
return MediaHandler.getAvailableDevices();
}
leave(): void {
// Stop publishing
if (this.isPublishing) {
this.stopPublishing();
}
// Send leave message
if (this.participantId) {
  const message = Protocol.createMessage(
    SignalingMessageType.LEAVE,
    this.roomId,
    this.participantId
  );
  this.signalingClient.send(message);
}

// Clean up
this.webrtcManager.closeAllConnections();
this.signalingClient.disconnect();
this.participants.clear();

console.log('Left room');
}
// Event handlers
onParticipantJoined(callback: (participant: Participant) => void): void {
this.onParticipantJoinedCallbacks.push(callback);
}
onParticipantLeft(callback: (participantId: string) => void): void {
this.onParticipantLeftCallbacks.push(callback);
}
onRemoteStream(callback: (participantId: string, stream: MediaStream) => void): void {
this.onRemoteStreamCallbacks.push(callback);
}
onError(callback: (error: Error) => void): void {
this.onErrorCallbacks.push(callback);
}
}