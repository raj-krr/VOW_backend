import { MediaChunk } from '../shared/types';
import { RoomManager } from './room';
import { Protocol } from '../shared/protocol';
import { BandwidthMonitor } from '../utils/bandwidth';
import logger from '../utils/logger';

export class MediaRouter {
  private bandwidthMonitor: BandwidthMonitor;
  private mediaBuffers: Map<string, Buffer[]> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();

  constructor(bandwidthMonitor: BandwidthMonitor) {
    this.bandwidthMonitor = bandwidthMonitor;
  }

  routeMediaChunk(
    room: RoomManager,
    fromParticipantId: string,
    chunkData: Buffer
  ) {
    try {
      // Decode the chunk
      const { metadata, chunk } = Protocol.decodeMediaChunk(chunkData);
      
      // Record bandwidth
      this.bandwidthMonitor.recordReceived(fromParticipantId, chunkData.length);

      // Validate sequence number
      const lastSeq = this.sequenceNumbers.get(fromParticipantId) || 0;
      if (metadata.sequence < lastSeq) {
        logger.warn(`Out of order packet from ${fromParticipantId}`);
        return;
      }
      this.sequenceNumbers.set(fromParticipantId, metadata.sequence);

      // Forward to all other participants
      const otherParticipants = room.getOtherParticipants(fromParticipantId);
      
      otherParticipants.forEach(participant => {
        const sent = participant.sendBinaryData(chunkData);
        if (sent) {
          this.bandwidthMonitor.recordSent(participant.participant.id, chunkData.length);
        }
      });

      logger.debug(
        `Routed ${metadata.type} chunk from ${fromParticipantId} to ${otherParticipants.length} participants`
      );
    } catch (error) {
      logger.error('Error routing media chunk:', error);
    }
  }

  requestKeyframe(room: RoomManager, fromParticipantId: string, targetParticipantId: string) {
    const targetParticipant = room.getParticipant(targetParticipantId);
    if (targetParticipant) {
      targetParticipant.sendMessage({
        type: 'request-keyframe',
        fromParticipantId
      });
      logger.debug(`Keyframe requested from ${targetParticipantId} by ${fromParticipantId}`);
    }
  }

  bufferMediaChunk(participantId: string, chunk: Buffer) {
    if (!this.mediaBuffers.has(participantId)) {
      this.mediaBuffers.set(participantId, []);
    }
    
    const buffer = this.mediaBuffers.get(participantId)!;
    buffer.push(chunk);

    // Keep only last 100 chunks
    if (buffer.length > 100) {
      buffer.shift();
    }
  }

  getBufferedChunks(participantId: string): Buffer[] {
    return this.mediaBuffers.get(participantId) || [];
  }

  clearBuffer(participantId: string) {
    this.mediaBuffers.delete(participantId);
    this.sequenceNumbers.delete(participantId);
  }

  getStats() {
    return {
      totalBuffers: this.mediaBuffers.size,
      bandwidthStats: this.bandwidthMonitor.getAllStats()
    };
  }
}