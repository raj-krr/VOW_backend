import { CHUNK_CONFIG } from '../shared/constants';
import { Protocol } from '../shared/protocol';

export class ChunkHandler {
  private sequenceNumber: number = 0;

  createVideoChunk(
    participantId: string,
    roomId: string,
    videoData: Uint8Array,
    isKeyframe: boolean = false
  ): Buffer {
    const metadata = {
      participantId,
      roomId,
      type: 'video',
      sequence: this.sequenceNumber++,
      timestamp: Date.now(),
      isKeyframe
    };

    return Protocol.encodeMediaChunk(Buffer.from(videoData), metadata);
  }

  createAudioChunk(
    participantId: string,
    roomId: string,
    audioData: Uint8Array
  ): Buffer {
    const metadata = {
      participantId,
      roomId,
      type: 'audio',
      sequence: this.sequenceNumber++,
      timestamp: Date.now()
    };

    return Protocol.encodeMediaChunk(Buffer.from(audioData), metadata);
  }

  decodeChunk(data: ArrayBuffer): { metadata: any; chunk: Uint8Array } {
    const buffer = Buffer.from(data);
    const decoded = Protocol.decodeMediaChunk(buffer);
    
    return {
      metadata: decoded.metadata,
      chunk: new Uint8Array(decoded.chunk)
    };
  }

  splitIntoChunks(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    const chunkSize = CHUNK_CONFIG.MAX_CHUNK_SIZE;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    return chunks;
  }

  reassembleChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  resetSequence() {
    this.sequenceNumber = 0;
  }
}