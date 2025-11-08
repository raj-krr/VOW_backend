import { WebSocketServer, WebSocket } from 'ws';
import { SFUServer } from './sfu';
import { Protocol } from '../shared/protocol';
import { SignalingMessageType } from '../shared/types';
import logger from '../utils/logger';
import { Server } from 'http';

export class WebSocketSignalingServer {
  private wss: WebSocketServer;
  private sfuServer: SFUServer;
  private participantSockets: Map<string, { roomId: string; participantId: string }> = new Map();

  constructor(server: Server, sfuServer: SFUServer) {
    this.wss = new WebSocketServer({ server, path: '/signaling' });
    this.sfuServer = sfuServer;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket) => {
      logger.info('New WebSocket connection');

      socket.on('message', async (data: Buffer) => {
        try {
          // Check if it's binary data (media chunk)
          if (data[0] === 0x00 && data[1] === 0x00) {
            this.handleBinaryMessage(socket, data);
          } else {
            // It's a text message (signaling)
            this.handleTextMessage(socket, data.toString());
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
      socket.send(JSON.stringify({ type: 'connected' }));
    });

    logger.info('WebSocket signaling server started');
  }

  private handleTextMessage(socket: WebSocket, data: string) {
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

  private handleBinaryMessage(socket: WebSocket, data: Buffer) {
    try {
      const socketInfo = this.participantSockets.get(this.getSocketId(socket));
      if (!socketInfo) {
        logger.warn('Binary message from unknown socket');
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

  private handleJoin(socket: WebSocket, message: any) {
    const { roomId, data } = message;
    const { participantName } = data;

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
    socket.send(JSON.stringify({
      type: SignalingMessageType.ROOM_STATE,
      roomId,
      participantId: result.participantId,
      data: result.roomState
    }));
  }

  private handleLeave(socket: WebSocket, message: any) {
    const { roomId, participantId } = message;
    this.sfuServer.handleLeave(roomId, participantId);

    const socketId = this.getSocketId(socket);
    this.participantSockets.delete(socketId);
  }

  private handleStartPublish(message: any) {
    const { roomId, participantId } = message;
    this.sfuServer.handleStartPublish(roomId, participantId);
  }

  private handleStopPublish(message: any) {
    const { roomId, participantId } = message;
    this.sfuServer.handleStopPublish(roomId, participantId);
  }

  private handleChatMessage(message: any) {
    const { roomId, participantId, data } = message;
    const { message: chatMessage } = data;
    
    this.sfuServer.handleChatMessage(roomId, participantId, chatMessage);
  }

  private handleStartLivestream(message: any) {
    const { roomId, participantId } = message;
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
  }

  private handleStopLivestream(message: any) {
    const { roomId, participantId } = message;
    this.sfuServer.handleStopLivestream(roomId, participantId);
  }

  private handleRequestKeyframe(message: any) {
    const { roomId, participantId, targetParticipantId } = message;
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

  private handleDisconnect(socket: WebSocket) {
    const socketId = this.getSocketId(socket);
    const socketInfo = this.participantSockets.get(socketId);

    if (socketInfo) {
      this.sfuServer.handleLeave(socketInfo.roomId, socketInfo.participantId);
      this.participantSockets.delete(socketId);
      logger.info(`Participant ${socketInfo.participantId} disconnected`);
    }
  }

  private sendError(socket: WebSocket, message: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: SignalingMessageType.ERROR,
        data: { message }
      }));
    }
  }

  private getSocketId(socket: WebSocket): string {
    return (socket as any)._socketId || ((socket as any)._socketId = Math.random().toString(36));
  }

  shutdown() {
    this.wss.close();
    logger.info('WebSocket server shutdown');
  }
}