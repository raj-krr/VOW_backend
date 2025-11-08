import { createClient, RedisClientType } from 'redis';
import { REDIS_KEYS } from '../shared/constants';
import logger from '../utils/logger';

export class RedisManager {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private messageHandlers: Map<string, Set<(message: any) => void>> = new Map();
  private isConnected: boolean = false;

  constructor(private redisUrl: string = 'redis://localhost:6379') {
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.publisher.on('error', (err) => logger.error('Redis Publisher Error:', err));
    this.subscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));
  }

  async connect() {
    try {
      await this.publisher.connect();
      await this.subscriber.connect();
      this.isConnected = true;
      logger.info('Redis connected successfully');

      // Setup message handler
      this.subscriber.on('message', (channel: string, message: string) => {
        const handlers = this.messageHandlers.get(channel);
        if (handlers) {
          try {
            const parsedMessage = JSON.parse(message);
            handlers.forEach(handler => handler(parsedMessage));
          } catch (error) {
            logger.error('Error parsing Redis message:', error);
          }
        }
      });
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping publish');
      return;
    }

    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Error publishing to Redis:', error);
    }
  }

  async subscribe(channel: string, handler: (message: any) => void): Promise<void> {
  if (!this.isConnected) {
    logger.warn('Redis not connected, skipping subscribe');
    return;
  }

  if (!this.messageHandlers.has(channel)) {
    this.messageHandlers.set(channel, new Set());

    await this.subscriber.subscribe(channel, (message: string) => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        try {
          const parsedMessage = JSON.parse(message);
          handlers.forEach(h => h(parsedMessage));
        } catch (error) {
          logger.error('Error parsing Redis message:', error);
        }
      }
    });

    logger.info(`Subscribed to Redis channel: ${channel}`);
  }

  this.messageHandlers.get(channel)!.add(handler);
}


  async unsubscribe(channel: string, handler?: (message: any) => void): Promise<void> {
    if (!handler) {
      // Unsubscribe from channel completely
      this.messageHandlers.delete(channel);
      await this.subscriber.unsubscribe(channel);
      logger.info(`Unsubscribed from Redis channel: ${channel}`);
    } else {
      // Remove specific handler
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel);
          await this.subscriber.unsubscribe(channel);
        }
      }
    }
  }

  async setRoomData(roomId: string, data: any): Promise<void> {
    const key = REDIS_KEYS.ROOM_PREFIX + roomId;
    await this.publisher.set(key, JSON.stringify(data));
  }

  async getRoomData(roomId: string): Promise<any | null> {
    const key = REDIS_KEYS.ROOM_PREFIX + roomId;
    const data = await this.publisher.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteRoomData(roomId: string): Promise<void> {
    const key = REDIS_KEYS.ROOM_PREFIX + roomId;
    await this.publisher.del(key);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    await this.publisher.quit();
    await this.subscriber.quit();
    logger.info('Redis disconnected');
  }
}