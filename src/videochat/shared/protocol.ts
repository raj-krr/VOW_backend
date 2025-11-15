import { SignalingMessage, SignalingMessageType } from './types';

export class Protocol {
  static serialize(message: SignalingMessage): string {
    return JSON.stringify(message);
  }

  static deserialize(data: string): SignalingMessage {
    try {
      return JSON.parse(data);
    } catch (err) {
      const e = new Error('Protocol.deserialize: invalid JSON');
      // @ts-ignore 
      e.cause = err;
      throw e;
    }
  }

  static createMessage(
    type: SignalingMessageType,
    roomId: string,
    participantId: string,
    data?: any,
    targetParticipantId?: string
  ): SignalingMessage {
    return {
      type,
      roomId,
      participantId,
      targetParticipantId,
      data
    };
  }

  static isValidMessage(message: any): message is SignalingMessage {
    if (!message || typeof message.type !== 'string') return false;

    if (typeof message.roomId !== 'string' || message.roomId.trim() === '') return false;

    if (message.type === SignalingMessageType.JOIN) {
      return true;
    }

    if (typeof message.participantId !== 'string' || message.participantId.trim() === '') {
      return false;
    }

    if ('targetParticipantId' in message && message.targetParticipantId != null && typeof message.targetParticipantId !== 'string') {
      return false;
    }

    return true;
  }

  static encodeMediaChunk(chunk: Buffer, metadata: any): Buffer {
    const metadataStr = JSON.stringify(metadata);
    const metadataBuffer = Buffer.from(metadataStr);
    const metadataLength = Buffer.alloc(4);
    metadataLength.writeUInt32BE(metadataBuffer.length, 0);

    return Buffer.concat([metadataLength, metadataBuffer, chunk]);
  }

  static decodeMediaChunk(data: Buffer): { metadata: any; chunk: Buffer } {
    const metadataLength = data.readUInt32BE(0);
    const metadataBuffer = data.slice(4, 4 + metadataLength);
    const metadata = JSON.parse(metadataBuffer.toString());
    const chunk = data.slice(4 + metadataLength);

    return { metadata, chunk };
  }
}
