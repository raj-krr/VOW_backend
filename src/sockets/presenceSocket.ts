import { Server, Socket } from "socket.io";
import { getRedis } from "../libs/redis";

const redisClient = getRedis();
const MAP_PRESENCE_KEY = (mapId: string) => `map:${mapId}:presence`;

export const setupPresenceSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected to presence socket: ${socket.id}`);

    socket.on("join-map", async ({ userId, mapId, displayName }) => {
      if (!userId || !mapId) return;
      socket.join(mapId);

      const userData = { userId, displayName, x: 0, y: 0, ts: Date.now() };

      if (redisClient) {
        try {
          await redisClient.hset(MAP_PRESENCE_KEY(mapId), userId, JSON.stringify(userData));
        } catch (err) {
          console.error("Redis error (join-map):", err);
        }
      } else {
        console.warn("Redis not available — skipping presence save");
      }

      io.to(mapId).emit("user-joined", userData);
    });

    socket.on("move", async ({ userId, mapId, x, y }) => {
      if (!userId || !mapId) return;

      const updatedData = { userId, x, y, ts: Date.now() };
      const key = MAP_PRESENCE_KEY(mapId);

      if (redisClient) {
        try {
          await redisClient.hset(key, userId, JSON.stringify(updatedData));
        } catch (err) {
          console.error("Redis error (move):", err);
        }
      }

      io.to(mapId).emit("user-moved", updatedData);
    });

    socket.on("leave-map", async ({ userId, mapId }) => {
      if (!userId || !mapId) return;
      const key = MAP_PRESENCE_KEY(mapId);

      if (redisClient) {
        try {
          await redisClient.hdel(key, userId);
        } catch (err) {
          console.error("Redis error (leave-map):", err);
        }
      }

      io.to(mapId).emit("user-left", { userId });
      socket.leave(mapId);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
