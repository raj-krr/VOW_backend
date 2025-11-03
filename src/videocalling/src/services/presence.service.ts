import { redis } from "../libs/redis.js";

export const presenceService = {
  async addParticipant(roomId: string, socketId: string, user: any) {
    await redis.hset(`room:${roomId}:participants`, socketId, JSON.stringify(user));
  },

  async removeParticipant(socketId: string) {
    const keys = await redis.keys("room:*:participants");
    for (const key of keys) {
      await redis.hdel(key, socketId);
      const remaining = await redis.hlen(key);
      if (remaining === 0) await redis.del(key);
    }
  },

  async getParticipants(roomId: string) {
    const map = await redis.hgetall(`room:${roomId}:participants`);
    return Object.entries(map).map(([socketId, userJson]) => ({
      socketId,
      ...(JSON.parse(userJson) || {}),
    }));
  },
};
