import Redis from "ioredis";
import { config } from "../config/index.js";

export const redis = new Redis(config.redisUrl);

export async function initRedis() {
  if (!redis.status || redis.status === "end") {
    await redis.connect();
  }
  redis.on("error", (err) => console.error("Redis error", err));
}
