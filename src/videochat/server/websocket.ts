// src/videochat/server/websocket.ts
import * as ws from 'ws';
import { SFUServer } from './sfu';
import { Protocol } from '../shared/protocol';
import { SignalingMessageType } from '../shared/types';
import logger from '../utils/logger';
import { Server, IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketSignalingServer {
  private wss: ws.WebSocketServer;
  private sfuServer: SFUServer;
  private participantSockets: Map<string, { roomId: string; participantId: string }> = new Map();

  /**
   * @param server 
   * @param sfuServer 
   * @param path 
   */
  constructor(server: Server, sfuServer: SFUServer, path = '/signaling') {
    this.sfuServer = sfuServer;
    this.wss = new ws.WebSocketServer({ server, path });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: ws.WebSocket, req?: IncomingMessage) => {
      const clientUrl = req && req.url ? req.url : '(unknown)';
      const remoteAddr = req && req.socket ? `${req.socket.remoteAddress}:${req.socket.remotePort}` : '(unknown)';
      logger.info(`New WebSocket connection from ${remoteAddr}, url: ${clientUrl}`);

      socket.on('message', async (data: ws.Data) => {
        try {
          // Normalize incoming data:
          // ws can give string | Buffer | ArrayBuffer | Buffer[]
          if (typeof data === 'string') {
            // text message
            this.handleTextMessage(socket, data);
            return;
          }

          // Convert ArrayBuffer / Buffer[] to Buffer
          let buf: Buffer;
          if (Buffer.isBuffer(data)) {
            buf = data;
          } else if (data instanceof ArrayBuffer) {
            buf = Buffer.from(data);
          } else if (Array.isArray(data)) {
            // Buffer[]
            buf = Buffer.concat((data as Buffer[]).map(d => Buffer.isBuffer(d) ? d : Buffer.from(d as any)));
          } else {
            // fallback
            buf = Buffer.from(data as any);
          }

          // Safety: check length before indexing
          if (buf.length >= 2 && buf[0] === 0x00 && buf[1] === 0x00) {
            this.handleBinaryMessage(socket, buf);
          } else {
            // maybe a text frame serialized as binary
            this.handleTextMessage(socket, buf.toString());
          }
        } catch (error) {
          logger.error('Error handling WebSocket message:', error);
          this.sendError(socket, 'Invalid message format');
        }
      });

      socket.on('close', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      // Send initial connection success
      try {
        if (socket.readyState === ws.WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'connected' }));
        }
      } catch (err) {
        logger.warn('Failed to send connection ack to client', String(err));
      }
    });

    logger.info('WebSocket signaling server started');
  }

  private handleTextMessage(socket: ws.WebSocket, data: string) {
    try {
      const message = Protocol.deserialize(data);

      if (!Protocol.isValidMessage(message)) {
        this.sendError(socket, 'Invalid message format');
        return;
      }

      switch (message.type) {
        case SignalingMessageType.JOIN:
          this.handleJoin(socket, message);
          break;

        case SignalingMessageType.LEAVE:
          this.handleLeave(socket, message);
          break;

        case SignalingMessageType.START_PUBLISH:
          this.handleStartPublish(message);
          break;

        case SignalingMessageType.STOP_PUBLISH:
          this.handleStopPublish(message);
          break;

        case SignalingMessageType.CHAT_MESSAGE:
          this.handleChatMessage(message);
          break;

        case SignalingMessageType.START_LIVESTREAM:
          this.handleStartLivestream(message);
          break;

        case SignalingMessageType.STOP_LIVESTREAM:
          this.handleStopLivestream(message);
          break;

        case SignalingMessageType.REQUEST_KEYFRAME:
          this.handleRequestKeyframe(message);
          break;

        case SignalingMessageType.OFFER:
        case SignalingMessageType.ANSWER:
        case SignalingMessageType.ICE_CANDIDATE:
          this.handleWebRTCSignaling(message);
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

      // Update heartbeat
      if (message.participantId && message.roomId) {
        this.sfuServer.handleHeartbeat(message.roomId, message.participantId);
      }
    } catch (error) {
      logger.error('Error handling text message:', error);
      this.sendError(socket, 'Error processing message');
    }
  }

  private handleBinaryMessage(socket: ws.WebSocket, data: Buffer) {
    try {
      const socketInfo = this.participantSockets.get(this.getSocketId(socket));
      if (!socketInfo) {
        logger.warn('Binary message from unknown socket — ignoring');
        return;
      }

      this.sfuServer.handleMediaChunk(
        socketInfo.roomId,
        socketInfo.participantId,
        data
      );
    } catch (error) {
      logger.error('Error handling binary message:', error);
    }
  }

  private handleJoin(socket: ws.WebSocket, message: any) {
    try {
      const { roomId, data } = message;
      const { participantName } = data || {};

      if (!roomId || !participantName) {
        this.sendError(socket, 'Missing roomId or participantName for join');
        return;
      }

      const result = this.sfuServer.handleJoin(roomId, participantName, socket);

      if (!result) {
        this.sendError(socket, 'Failed to join room');
        return;
      }

      // Store socket mapping
      const socketId = this.getSocketId(socket);
      this.participantSockets.set(socketId, {
        roomId,
        participantId: result.participantId
      });

      // Send success response
      if (socket.readyState === ws.WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: SignalingMessageType.ROOM_STATE,
          roomId,
          participantId: result.participantId,
          data: result.roomState
        }));
      }
    } catch (err) {
      logger.error('handleJoin error:', err);
      this.sendError(socket, 'Failed to join room (internal error)');
    }
  }

  private handleLeave(socket: ws.WebSocket, message: any) {
    try {
      const { roomId, participantId } = message;
      if (!roomId || !participantId) {
        logger.warn('handleLeave missing roomId or participantId');
        return;
      }

      this.sfuServer.handleLeave(roomId, participantId);

      const socketId = this.getSocketId(socket);
      this.participantSockets.delete(socketId);
    } catch (err) {
      logger.error('handleLeave error:', err);
    }
  }

  private handleStartPublish(message: any) {
    const { roomId, participantId } = message;
    if (!roomId || !participantId) return;
    this.sfuServer.handleStartPublish(roomId, participantId);
  }

  private handleStopPublish(message: any) {
    const { roomId, participantId } = message;
    if (!roomId || !participantId) return;
    this.sfuServer.handleStopPublish(roomId, participantId);
  }

  private handleChatMessage(message: any) {
    try {
      const { roomId, participantId, data } = message;
      const chatMessage = data && data.message;
      if (!roomId || !participantId || !chatMessage) return;

      this.sfuServer.handleChatMessage(roomId, participantId, chatMessage);
    } catch (err) {
      logger.error('handleChatMessage error:', err);
    }
  }

  private handleStartLivestream(message: any) {
    try {
      const { roomId, participantId } = message;
      if (!roomId || !participantId) return;

      const streamKey = this.sfuServer.handleStartLivestream(roomId, participantId);

      const room = this.sfuServer.getRoom(roomId);
      if (room) {
        const participant = room.getParticipant(participantId);
        if (participant) {
          participant.sendMessage({
            type: 'livestream-started',
            streamKey
          });
        }
      }
    } catch (err) {
      logger.error('handleStartLivestream error:', err);
    }
  }

  private handleStopLivestream(message: any) {
    const { roomId, participantId } = message;
    if (!roomId || !participantId) return;
    this.sfuServer.handleStopLivestream(roomId, participantId);
  }

  private handleRequestKeyframe(message: any) {
    try {
      const { roomId, participantId, targetParticipantId } = message;
      if (!roomId || !targetParticipantId) return;

      const room = this.sfuServer.getRoom(roomId);
      if (room) {
        const targetParticipant = room.getParticipant(targetParticipantId);
        if (targetParticipant) {
          targetParticipant.sendMessage({
            type: 'request-keyframe',
            fromParticipantId: participantId
          });
        }
      }
    } catch (err) {
      logger.error('handleRequestKeyframe error:', err);
    }
  }

  private handleWebRTCSignaling(message: any) {
    const { roomId, targetParticipantId } = message;

    if (!targetParticipantId) {
      logger.warn('WebRTC signaling message missing target participant');
      return;
    }

    const room = this.sfuServer.getRoom(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for WebRTC signaling`);
      return;
    }

    const targetParticipant = room.getParticipant(targetParticipantId);
    if (targetParticipant) {
      targetParticipant.sendMessage(message);
    }
  }

  private handleDisconnect(socket: ws.WebSocket) {
    const socketId = this.getSocketId(socket);
    const socketInfo = this.participantSockets.get(socketId);

    if (socketInfo) {
      try {
        this.sfuServer.handleLeave(socketInfo.roomId, socketInfo.participantId);
      } catch (err) {
        logger.warn('Error during handleLeave on disconnect: ' + String(err));
      }
      this.participantSockets.delete(socketId);
      logger.info(`Participant ${socketInfo.participantId} disconnected`);
    } else {
      logger.info('Socket disconnected (no associated participant)');
    }
  }

  private sendError(socket: ws.WebSocket, message: string) {
    try {
      if (socket.readyState === ws.WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: SignalingMessageType.ERROR,
          data: { message }
        }));
      }
    } catch (err) {
      logger.warn('Failed to send error to socket: ' + String(err));
    }
  }

  private getSocketId(socket: ws.WebSocket): string {
    return (socket as any)._socketId || ((socket as any)._socketId = uuidv4());
  }

  shutdown() {
    try {
      this.wss.close();
      logger.info('WebSocket server shutdown');
    } catch (err) {
      logger.warn('Error shutting down WebSocket server: ' + String(err));
    }
  }
}
