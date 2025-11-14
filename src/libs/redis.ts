import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379"; // fallback local

let client: Redis;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    client.on("connect", () => {
      console.log("🔥 Redis connecting");
    });

    client.on("ready", () => {
      console.log("🔥 Redis ready");
    });

    client.on("error", (err) => {
      console.error("❌ Redis error:", err);
    });

    client.on("close", () => {
      console.log("⚠️ Redis connection closed");
    });
  }

  return client; 
}
