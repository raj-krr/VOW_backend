import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (process.env.USE_REDIS !== "true") {
    console.log("⚠️ Redis disabled (dev mode)");
    return null;
  }

  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    client.on("ready", () => {
      console.log("✅ Redis ready");
    });

    client.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
    });
  }

  return client;
}