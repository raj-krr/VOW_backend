import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../libs/redis.js";

export async function buildRedisAdapter() {
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  return createAdapter(pubClient, subClient);
}
