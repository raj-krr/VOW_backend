// src/videochat/server/sfu.ts
import { RoomManager } from './room';
import { ParticipantManager } from './participant';
import { MediaRouter } from './mediaRouter';
import { ChatManager } from './chat';
import { StreamingManager } from './streaming';
import RedisManager from './redis';
import { BandwidthMonitor } from '../utils/bandwidth';
import { Participant, SignalingMessageType } from '../shared/types';
import { Protocol } from '../shared/protocol';
import { LIMITS, REDIS_KEYS } from '../shared/constants';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';

export class SFUServer {
  private rooms: Map<string, RoomManager> = new Map();
  private roomCreatedAt: Map<string, number> = new Map();
  private bandwidthMonitor: BandwidthMonitor;
  private mediaRouter: MediaRouter;
  private chatManager: ChatManager;
  private streamingManager: StreamingManager;
  private redisManager: RedisManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private static readonly ROOM_EMPTY_TTL_MS = Number(process.env.ROOM_EMPTY_TTL_MS ?? 240000);

  constructor(redisUrl?: string) {
    this.bandwidthMonitor = new BandwidthMonitor();
    this.mediaRouter = new MediaRouter(this.bandwidthMonitor);
    this.chatManager = new ChatManager(this.rooms);
    this.streamingManager = new StreamingManager(this.rooms, this.mediaRouter);
    this.redisManager = new RedisManager(redisUrl);
  }

  async initialize() {
    await this.redisManager.connect();

    try {
      await this.redisManager.subscribe(REDIS_KEYS.SIGNALING_CHANNEL, (message: any) => {
        try {
          const { type, roomId, roomName } = message || {};
          if (!type || !roomId) {
            logger.debug(`[SFU:${process.pid}] redis: received message missing type/roomId — ignored`);
            return;
          }

          if (type === 'room-created') {
            if (!this.rooms.has(roomId)) {
              logger.info(`[SFU:${process.pid}] redis event: room-created ${roomId}`);
              const rm = new RoomManager(roomId, roomName ?? `call-${Date.now()}`);
              this.rooms.set(roomId, rm);
              this.roomCreatedAt.set(roomId, Date.now());
              logger.info(`[SFU:${process.pid}] rooms now: ${JSON.stringify(this.listRooms())}`);
            } else {
              logger.debug(`[SFU:${process.pid}] redis: room ${roomId} already exists locally`);
            }
          } else if (type === 'room-deleted') {
            if (this.rooms.has(roomId)) {
              logger.info(`[SFU:${process.pid}] redis event: room-deleted ${roomId}`);
              const r = this.rooms.get(roomId)!;
              r.cleanup();
              this.rooms.delete(roomId);
              this.roomCreatedAt.delete(roomId);
              this.streamingManager.cleanup(roomId);
            }
          } else if (type === 'participant-joined' || type === 'participant-left') {

            logger.debug(`[SFU:${process.pid}] redis event: ${type} ${roomId}`);
          } else {
            logger.debug(`[SFU:${process.pid}] redis unknown event type: ${type}`);
          }
        } catch (err) {
          logger.error('Error in redis signaling handler:', err);
        }
      });
    } catch (err) {
      logger.warn('Failed to subscribe to redis signaling channel:', err);
    }

    this.startHeartbeat();
    logger.info(`[SFU:${process.pid}] SFU Server initialized`);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.rooms.forEach(room => {
        room.getAllParticipants().forEach(participant => {
          if (!participant.isAlive(LIMITS.PARTICIPANT_TIMEOUT)) {
            logger.warn(`Participant ${participant.participant.id} timed out`);
            this.handleLeave(room.getId(), participant.participant.id);
          }
        });

        if (room.isEmpty()) {
          const createdAt = this.roomCreatedAt.get(room.getId()) ?? 0;
          const age = Date.now() - createdAt;
          if (age >= SFUServer.ROOM_EMPTY_TTL_MS) {
            logger.info(`[SFU:${process.pid}] Room ${room.getId()} empty for ${age}ms -> deleting`);
            this.deleteRoom(room.getId()).catch(() => {});
          } else {
            logger.debug(
              `[SFU:${process.pid}] Room ${room.getId()} is empty but only ${age}ms old (waiting ${SFUServer.ROOM_EMPTY_TTL_MS}ms)`
            );
          }
        }
      });
    }, LIMITS.HEARTBEAT_INTERVAL);
  }

  public listRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  async createRoom(roomName: string): Promise<string> {
    if (this.rooms.size >= LIMITS.MAX_ROOMS) {
      throw new Error('Maximum number of rooms reached');
    }

    const roomId = uuidv4();
    const room = new RoomManager(roomId, roomName);
    this.rooms.set(roomId, room);
    this.roomCreatedAt.set(roomId, Date.now());

    try {
      await this.redisManager.setRoomData(roomId, {
        roomId,
        roomName,
        createdAt: Date.now()
      });
    } catch (err) {
      logger.warn('Failed to set room data in redis (continuing): ' + String(err));
    }

    const payload = { type: 'room-created', roomId, roomName };
    try {
      await this.redisManager.publish(REDIS_KEYS.SIGNALING_CHANNEL, payload);
    } catch (err) {
      logger.warn('Failed to publish room-created event to redis: ' + String(err));
    }

    logger.info(`[SFU:${process.pid}] Room created: ${roomId} - ${roomName}`);
    logger.debug(`[SFU:${process.pid}] Current rooms after create: ${JSON.stringify(this.listRooms())}`);
    return roomId;
  }

  getRoom(roomId: string): RoomManager | undefined {
    const found = this.rooms.get(roomId);
    logger.info(`[SFU:${process.pid}] getRoom(${roomId}) => ${found ? 'FOUND' : 'NOT FOUND'}`);
    logger.debug(`[SFU:${process.pid}] Current rooms when getRoom called: ${JSON.stringify(this.listRooms())}`);
    return found;
  }

  async deleteRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.cleanup();
      this.rooms.delete(roomId);
      this.roomCreatedAt.delete(roomId);
      this.streamingManager.cleanup(roomId);

      try {
        await this.redisManager.deleteRoomData(roomId);
      } catch (err) {
        logger.warn('Failed to delete room data from redis: ' + String(err));
      }

      const payload = { type: 'room-deleted', roomId };
      try {
        await this.redisManager.publish(REDIS_KEYS.SIGNALING_CHANNEL, payload);
      } catch (err) {
        logger.warn('Failed to publish room-deleted event to redis: ' + String(err));
      }

      logger.info(`[SFU:${process.pid}] Room deleted: ${roomId}`);
    }
  }

  handleJoin(
    roomId: string,
    participantName: string,
    socket: WebSocket
  ): { participantId: string; roomState: any } | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found`);
      return null;
    }

    if (!room.canJoin()) {
      logger.warn(`Room ${roomId} is full`);
      return null;
    }

    const participantId = uuidv4();
    const participant: Participant = {
      id: participantId,
      roomId,
      name: participantName,
      joinedAt: Date.now(),
      isPublishing: false,
      streams: {
        video: false,
        audio: false
      }
    };

    const manager = new ParticipantManager(participant, socket);
    room.addParticipant(manager);

    this.chatManager.sendChatHistory(roomId, participantId);

    const joinMessage = Protocol.createMessage(
      SignalingMessageType.PARTICIPANT_JOINED,
      roomId,
      participantId,
      { participant: manager.toJSON() }
    );
    room.broadcastMessage(joinMessage, participantId);

    this.redisManager.publish(REDIS_KEYS.SIGNALING_CHANNEL, {
      type: 'participant-joined',
      roomId,
      participantId,
      participantName
    }).catch(() => {});

    logger.info(`[SFU:${process.pid}] Participant ${participantName} (${participantId}) joined room ${roomId}`);

    return {
      participantId,
      roomState: room.getRoomState()
    };
  }

  handleLeave(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.getParticipant(participantId);
    if (!participant) return;

    this.bandwidthMonitor.removeParticipant(participantId);
    this.mediaRouter.clearBuffer(participantId);

    room.removeParticipant(participantId);

    const leaveMessage = Protocol.createMessage(
      SignalingMessageType.PARTICIPANT_LEFT,
      roomId,
      participantId
    );
    room.broadcastMessage(leaveMessage);

    this.redisManager.publish(REDIS_KEYS.SIGNALING_CHANNEL, {
      type: 'participant-left',
      roomId,
      participantId
    }).catch(() => {});

    logger.info(`[SFU:${process.pid}] Participant ${participantId} left room ${roomId}`);

    if (room.isEmpty()) {
      const delay = SFUServer.ROOM_EMPTY_TTL_MS;
      logger.info(`[SFU:${process.pid}] Room ${roomId} empty after leave — scheduling delete in ${delay}ms`);
      setTimeout(() => {
        const r = this.rooms.get(roomId);
        if (r && r.isEmpty()) {
          logger.info(`[SFU:${process.pid}] Delayed delete: room ${roomId} still empty -> deleting now`);
          this.deleteRoom(roomId).catch(() => {});
        } else {
          logger.info(`[SFU:${process.pid}] Delayed delete: room ${roomId} no longer empty or not found -> skipping`);
        }
      }, delay);
    }
  }

  handleMediaChunk(roomId: string, participantId: string, chunkData: Buffer) {
    const room = this.rooms.get(roomId);
    if (!room) {
      logger.warn(`Room ${roomId} not found for media chunk`);
      return;
    }

    const participant = room.getParticipant(participantId);
    if (!participant) {
      logger.warn(`Participant ${participantId} not found for media chunk`);
      return;
    }

    const stats = this.bandwidthMonitor.calculateStats(participantId);
    const check = this.bandwidthMonitor.checkThreshold(participantId);

    if (!check.ok) {
      logger.warn(`Bandwidth issue for ${participantId}: ${check.reason}`);
      participant.sendMessage({
        type: 'bandwidth-warning',
        reason: check.reason,
        stats
      });
    }

    this.mediaRouter.routeMediaChunk(room, participantId, chunkData);

    if (room.isLivestreaming()) {
      this.streamingManager.handleStreamData(roomId, chunkData);
    }
  }

  handleStartPublish(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.getParticipant(participantId);
    if (!participant) return;

    participant.setPublishing(true);

    room.broadcastMessage({
      type: 'participant-started-publishing',
      roomId,
      participantId
    }, participantId);

    logger.info(`Participant ${participantId} started publishing in room ${roomId}`);
  }

  handleStopPublish(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.getParticipant(participantId);
    if (!participant) return;

    participant.setPublishing(false);

    room.broadcastMessage({
      type: 'participant-stopped-publishing',
      roomId,
      participantId
    }, participantId);

    logger.info(`Participant ${participantId} stopped publishing in room ${roomId}`);
  }

  handleChatMessage(roomId: string, participantId: string, message: string) {
    return this.chatManager.handleChatMessage(roomId, participantId, message);
  }

  handleStartLivestream(roomId: string, participantId: string) {
    return this.streamingManager.startLivestream(roomId, participantId);
  }

  handleStopLivestream(roomId: string, participantId: string) {
    return this.streamingManager.stopLivestream(roomId, participantId);
  }

  handleHeartbeat(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.getParticipant(participantId);
    if (participant) {
      participant.updateHeartbeat();
    }
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalParticipants: Array.from(this.rooms.values())
        .reduce((sum, room) => sum + room.getParticipantCount(), 0),
      bandwidthStats: this.bandwidthMonitor.getAllStats(),
      mediaRouterStats: this.mediaRouter.getStats(),
      activeStreams: this.streamingManager.getActiveStreams()
    };
  }

  async shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.rooms.forEach(room => room.cleanup());
    this.rooms.clear();
    this.roomCreatedAt.clear();

    await this.redisManager.disconnect();
    logger.info(`[SFU:${process.pid}] SFU Server shutdown complete`);
  }
}

export default SFUServer;
