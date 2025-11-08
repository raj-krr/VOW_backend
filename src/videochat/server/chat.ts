import { ChatMessage, SignalingMessageType } from '../shared/types';
import { RoomManager } from './room';
import { Protocol } from '../shared/protocol';
import logger from '../utils/logger';

export class ChatManager {
  private rooms: Map<string, RoomManager>;

  constructor(rooms: Map<string, RoomManager>) {
    this.rooms = rooms;
  }

  handleChatMessage(
    roomId: string,
    participantId: string,
    message: string
  ): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for chat message`);
      return null;
    }

    const chatMessage = room.addChatMessage(participantId, message);
    if (!chatMessage) {
      return null;
    }

    // Broadcast to all participants in the room
    const broadcastMessage = Protocol.createMessage(
      SignalingMessageType.CHAT_MESSAGE,
      roomId,
      participantId,
      chatMessage
    );

    room.broadcastMessage(broadcastMessage);
    logger.debug(`Chat message broadcast in room ${roomId}`);

    return chatMessage;
  }

  getChatHistory(roomId: string): ChatMessage[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for chat history`);
      return [];
    }

    return room.getChatHistory();
  }

  sendChatHistory(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.getParticipant(participantId);
    if (!participant) return;

    const history = room.getChatHistory();
    const message = Protocol.createMessage(
      SignalingMessageType.CHAT_HISTORY,
      roomId,
      participantId,
      { messages: history }
    );

    participant.sendMessage(message);
    logger.debug(`Chat history sent to ${participantId} in room ${roomId}`);
  }
}