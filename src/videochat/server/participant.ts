import { Participant } from '../shared/types';
import { WebSocket } from 'ws';
import logger from '../utils/logger';

export class ParticipantManager {
  public participant: Participant;
  public socket: WebSocket;
  private lastHeartbeat: number;
  private mediaSequence: number = 0;

  constructor(participant: Participant, socket: WebSocket) {
    this.participant = participant;
    this.socket = socket;
    this.lastHeartbeat = Date.now();
  }

  sendMessage(message: any): boolean {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error sending message to ${this.participant.id}:`, error);
      return false;
    }
  }

  sendBinaryData(data: Buffer): boolean {
    try {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(data);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error sending binary data to ${this.participant.id}:`, error);
      return false;
    }
  }

  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  isAlive(timeout: number = 60000): boolean {
    return Date.now() - this.lastHeartbeat < timeout;
  }

  getNextSequence(): number {
    return this.mediaSequence++;
  }

  setPublishing(isPublishing: boolean) {
    this.participant.isPublishing = isPublishing;
  }

  updateStreams(video: boolean, audio: boolean) {
    this.participant.streams.video = video;
    this.participant.streams.audio = audio;
  }

  disconnect() {
    if (this.socket.readyState === WebSocket.OPEN || 
        this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close();
    }
  }

  toJSON() {
    return {
      id: this.participant.id,
      name: this.participant.name,
      joinedAt: this.participant.joinedAt,
      isPublishing: this.participant.isPublishing,
      streams: this.participant.streams
    };
  }
}