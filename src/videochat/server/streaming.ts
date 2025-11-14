import { RoomManager } from './room';
import { MediaRouter } from './mediaRouter';
import { Protocol } from '../shared/protocol';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class StreamingManager {
  private rooms: Map<string, RoomManager>;
  private mediaRouter: MediaRouter;
  private activeStreams: Map<string, string> = new Map();
  private streamBuffers: Map<string, Buffer[]> = new Map();

  constructor(rooms: Map<string, RoomManager>, mediaRouter: MediaRouter) {
    this.rooms = rooms;
    this.mediaRouter = mediaRouter;
  }

  startLivestream(roomId: string, participantId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for livestream`);
      return null;
    }

    const participant = room.getParticipant(participantId);
    if (!participant) {
      logger.warn(`Participant ${participantId} not found for livestream`);
      return null;
    }

    const streamKey = uuidv4();
    room.startLivestream(streamKey);
    this.activeStreams.set(roomId, streamKey);
    this.streamBuffers.set(roomId, []);

    logger.info(`Livestream started in room ${roomId} with key ${streamKey}`);

    // Notify all participants
    room.broadcastMessage({
      type: 'livestream-started',
      roomId,
      streamKey,
      startedBy: participantId
    });

    return streamKey;
  }

  stopLivestream(roomId: string, participantId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for stopping livestream`);
      return false;
    }

    if (!room.isLivestreaming()) {
      logger.warn(`Room ${roomId} is not livestreaming`);
      return false;
    }

    room.stopLivestream();
    this.activeStreams.delete(roomId);
    this.streamBuffers.delete(roomId);

    logger.info(`Livestream stopped in room ${roomId}`);

    // Notify all participants
    room.broadcastMessage({
      type: 'livestream-stopped',
      roomId,
      stoppedBy: participantId
    });

    return true;
  }

  handleStreamData(roomId: string, data: Buffer) {
    if (!this.activeStreams.has(roomId)) {
      return;
    }

    const buffer = this.streamBuffers.get(roomId);
    if (buffer) {
      buffer.push(data);

      // Keep only last 300 chunks (~20 seconds at 15fps)
      if (buffer.length > 300) {
        buffer.shift();
      }
    }

    // Here you would typically forward to an RTMP server or CDN
    // For now, we just buffer the data
    logger.debug(`Buffered stream data for room ${roomId}: ${data.length} bytes`);
  }

  getStreamBuffer(roomId: string): Buffer[] {
    return this.streamBuffers.get(roomId) || [];
  }

  isStreaming(roomId: string): boolean {
    return this.activeStreams.has(roomId);
  }

  getStreamKey(roomId: string): string | undefined {
    return this.activeStreams.get(roomId);
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  cleanup(roomId: string) {
    this.activeStreams.delete(roomId);
    this.streamBuffers.delete(roomId);
    logger.info(`Cleaned up streaming data for room ${roomId}`);
  }
}