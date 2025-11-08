import { Room, Participant, ChatMessage } from '../shared/types';
import { ParticipantManager } from './participant';
import { LIMITS } from '../shared/constants';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private room: Room;
  private participants: Map<string, ParticipantManager> = new Map();
  private chatHistory: ChatMessage[] = [];

  constructor(roomId: string, roomName: string) {
    this.room = {
      id: roomId,
      name: roomName,
      participants: new Map(),
      createdAt: Date.now(),
      isLivestreaming: false
    };
    logger.info(`Room created: ${roomId} - ${roomName}`);
  }

  getId(): string {
    return this.room.id;
  }

  getName(): string {
    return this.room.name;
  }

  canJoin(): boolean {
    return this.participants.size < LIMITS.MAX_PARTICIPANTS;
  }

  addParticipant(manager: ParticipantManager): boolean {
    if (!this.canJoin()) {
      logger.warn(`Room ${this.room.id} is full`);
      return false;
    }

    this.participants.set(manager.participant.id, manager);
    this.room.participants.set(manager.participant.id, manager.participant);
    
    logger.info(`Participant ${manager.participant.name} (${manager.participant.id}) joined room ${this.room.id}`);
    return true;
  }

  removeParticipant(participantId: string): boolean {
    const manager = this.participants.get(participantId);
    if (!manager) return false;

    manager.disconnect();
    this.participants.delete(participantId);
    this.room.participants.delete(participantId);
    
    logger.info(`Participant ${participantId} left room ${this.room.id}`);
    return true;
  }

  getParticipant(participantId: string): ParticipantManager | undefined {
    return this.participants.get(participantId);
  }

  getAllParticipants(): ParticipantManager[] {
    return Array.from(this.participants.values());
  }

  getOtherParticipants(excludeId: string): ParticipantManager[] {
    return Array.from(this.participants.values())
      .filter(p => p.participant.id !== excludeId);
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  broadcastMessage(message: any, excludeId?: string) {
    this.participants.forEach((manager, id) => {
      if (id !== excludeId) {
        manager.sendMessage(message);
      }
    });
  }

  broadcastBinaryData(data: Buffer, excludeId?: string) {
    this.participants.forEach((manager, id) => {
      if (id !== excludeId) {
        manager.sendBinaryData(data);
      }
    });
  }

  addChatMessage(participantId: string, message: string): ChatMessage | null {
    const participant = this.room.participants.get(participantId);
    if (!participant) {
      logger.warn(`Participant ${participantId} not found in room ${this.room.id}`);
      return null;
    }

    if (message.length > LIMITS.MAX_MESSAGE_LENGTH) {
      logger.warn(`Message too long from ${participantId}`);
      return null;
    }

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      roomId: this.room.id,
      participantId,
      participantName: participant.name,
      message: message.trim(),
      timestamp: Date.now()
    };

    this.chatHistory.push(chatMessage);

    // Keep only last N messages
    if (this.chatHistory.length > LIMITS.MAX_CHAT_HISTORY) {
      this.chatHistory = this.chatHistory.slice(-LIMITS.MAX_CHAT_HISTORY);
    }

    logger.debug(`Chat message added in room ${this.room.id} from ${participant.name}`);
    return chatMessage;
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  startLivestream(streamKey: string) {
    this.room.isLivestreaming = true;
    this.room.livestreamKey = streamKey;
    logger.info(`Livestream started in room ${this.room.id}`);
  }

  stopLivestream() {
    this.room.isLivestreaming = false;
    this.room.livestreamKey = undefined;
    logger.info(`Livestream stopped in room ${this.room.id}`);
  }

  isLivestreaming(): boolean {
    return this.room.isLivestreaming;
  }

  getRoomState() {
    return {
      id: this.room.id,
      name: this.room.name,
      participantCount: this.participants.size,
      participants: Array.from(this.participants.values()).map(p => p.toJSON()),
      isLivestreaming: this.room.isLivestreaming,
      createdAt: this.room.createdAt
    };
  }

  cleanup() {
    this.participants.forEach(manager => manager.disconnect());
    this.participants.clear();
    this.room.participants.clear();
    this.chatHistory = [];
    logger.info(`Room ${this.room.id} cleaned up`);
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }
}