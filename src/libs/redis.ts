import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
  if (!client) {
    client = new Redis(REDIS_URL);

    client.on("connect", () => {
      console.log("Redis connecting");
    });

    client.on("ready", () => {
      console.log("Redis ready");
    });

    client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    client.on("close", () => {
      console.log("Redis closed");
    });
  }
  return client;
}
