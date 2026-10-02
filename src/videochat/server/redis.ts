// src/videochat/server/redis.ts
import IORedis, { Redis } from "ioredis";
import logger from "../utils/logger";

const DEFAULT_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export class RedisManager {
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private url: string;
  private isConnected = false;

  constructor(url?: string) {
    this.url = url ?? DEFAULT_URL;
  }

  async connect() {
    if (process.env.USE_REDIS !== "true" && !process.env.REDIS_URL) {
      logger.info("[redis] Redis disabled or REDIS_URL not set (single-node mode)");
      return;
    }

    if (this.pubClient && this.subClient) return;

    try {
      const isTls = this.url.startsWith("rediss://");
      const redisOptions = {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Stop retrying if Redis connection fails
        lazyConnect: true,
        ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
      };

      this.pubClient = new IORedis(this.url, redisOptions);
      this.subClient = new IORedis(this.url, redisOptions);

      this.pubClient.on("error", (err) => logger.warn("[redis] pubClient unavailable:", err.message));
      this.subClient.on("error", (err) => logger.warn("[redis] subClient unavailable:", err.message));

      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.isConnected = true;
      logger.info("[redis] connected successfully");
    } catch (err: any) {
      logger.warn("[redis] Connection failed — running without Redis multi-node sync:", err.message);
      this.pubClient = null;
      this.subClient = null;
      this.isConnected = false;
    }
  }

  async disconnect() {
    try {
      await Promise.all([
        this.pubClient?.quit().catch(() => {}),
        this.subClient?.quit().catch(() => {}),
      ]);
    } catch (e) {
      logger.warn("[redis] disconnect error", e);
    } finally {
      this.pubClient = null;
      this.subClient = null;
      this.isConnected = false;
    }
  }

  async publish(channel: string, payload: any) {
    if (!this.pubClient || !this.isConnected) return;
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    try {
      await this.pubClient.publish(channel, message);
    } catch (err) {
      logger.warn("[redis] publish failed:", err);
    }
  }

  async subscribe(channel: string, handler: (message: any) => void) {
    if (!this.subClient || !this.isConnected) return;
    try {
      await this.subClient.subscribe(channel);
      logger.info(`[redis] subscribed to ${channel}`);

      this.subClient.on("message", (ch: string, rawMessage: string) => {
        try {
          logger.debug(`[redis:${process.pid}] message on ${ch}: ${rawMessage}`);
          let parsed: any = rawMessage;
          try {
            parsed = JSON.parse(rawMessage);
          } catch (e) {
            logger.debug(`[redis:${process.pid}] message not json on ${ch}`);
          }
          handler(parsed);
        } catch (err) {
          logger.error("[redis] error handling message:", err);
        }
      });
    } catch (err) {
      logger.warn(`[redis] subscribe to ${channel} failed:`, err);
    }
  }

  async setRoomData(roomId: string, data: any) {
    if (!this.pubClient || !this.isConnected) return;
    try {
      await this.pubClient.hset(`room:${roomId}`, data as any);
    } catch (err) {
      logger.warn("[redis] setRoomData failed:", err);
    }
  }

  async deleteRoomData(roomId: string) {
    if (!this.pubClient || !this.isConnected) return;
    try {
      await this.pubClient.del(`room:${roomId}`);
    } catch (err) {
      logger.warn("[redis] deleteRoomData failed:", err);
    }
  }
}

export default RedisManager;
