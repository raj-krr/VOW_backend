// src/videochat/server/redis.ts
import IORedis, { Redis } from "ioredis";
import logger from "../utils/logger";

const DEFAULT_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export class RedisManager {
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private url: string;

  constructor(url?: string) {
    this.url = url ?? DEFAULT_URL;
  }

  async connect() {
    if (this.pubClient && this.subClient) return;

    this.pubClient = new IORedis(this.url);
    this.subClient = new IORedis(this.url);

    this.pubClient.on("error", (err) => logger.error("[redis] pubClient error:", err));
    this.subClient.on("error", (err) => logger.error("[redis] subClient error:", err));

    await Promise.all([
      new Promise<void>((res) => this.pubClient!.once("ready", () => res())),
      new Promise<void>((res) => this.subClient!.once("ready", () => res())),
    ]);
    logger.info("[redis] connected");
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
    }
  }

  async publish(channel: string, payload: any) {
    if (!this.pubClient) throw new Error("Redis not connected");
    const message = typeof payload === "string" ? payload : JSON.stringify(payload);
    try {
      await this.pubClient.publish(channel, message);
    } catch (err) {
      logger.warn("[redis] publish failed:", err);
      throw err;
    }
  }

  async subscribe(channel: string, handler: (message: any) => void) {
    if (!this.subClient) throw new Error("Redis not connected");
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
  }

  async setRoomData(roomId: string, data: any) {
    if (!this.pubClient) throw new Error("Redis not connected");
    try {
      await this.pubClient.hset(`room:${roomId}`, data as any);
    } catch (err) {
      logger.warn("[redis] setRoomData failed:", err);
    }
  }

  async deleteRoomData(roomId: string) {
    if (!this.pubClient) throw new Error("Redis not connected");
    try {
      await this.pubClient.del(`room:${roomId}`);
    } catch (err) {
      logger.warn("[redis] deleteRoomData failed:", err);
    }
  }
}

export default RedisManager;
