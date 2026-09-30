import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL || process.env.USE_REDIS === "false") {
    console.log("⚠️ Redis disabled or REDIS_URL empty (running in single-node mode)");
    return null;
  }

  if (!client) {
    const isTls = REDIS_URL.startsWith("rediss://");
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });

    client.on("ready", () => {
      console.log("✅ Online Cloud Redis connected and ready");
    });

    client.on("error", (err) => {
      console.warn("⚠️ Redis error:", err.message);
    });
  }

  return client;
}