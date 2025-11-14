import { Server, Socket } from "socket.io";
import { getRedis } from "../libs/redis";
import { verifySocketToken, getTokenFromSocket } from "./auth";

const redisClient = getRedis();
const MAP_PRESENCE_KEY = (mapId: string) => `map:${mapId}:presence`;

export const setupPresenceSocket = async (io: Server, socket: Socket) => {
  try {
    
    let cookieToken: string | undefined = undefined;

    const rawCookie = socket.handshake.headers.cookie;
    if (rawCookie) {
      const cookies = Object.fromEntries(
        rawCookie.split(";").map((c) => c.trim().split("="))
      );
      cookieToken = cookies.accessToken; 
    }


    const headerToken = getTokenFromSocket(socket);
    const authToken = socket.handshake.auth?.token;

    const token = cookieToken || headerToken || authToken;

    if (!token) {
      throw new Error("No authentication token provided");
    }

    const user = await verifySocketToken(token);

    console.log(
      `User connected to presence socket: ${socket.id}, userId: ${user._id}`
    );

    socket.on("join-map", async ({ userId, mapId, displayName }) => {
      if (!userId || !mapId)
        return socket.emit("error", "userId and mapId are required");

      if (userId !== String(user._id)) {
        return socket.emit("error", "Unauthorized: userId mismatch");
      }

      socket.join(mapId);

      const userData = {
        userId,
        displayName: displayName || user.username,
        x: 0,
        y: 0,
        ts: Date.now(),
      };

      if (redisClient) {
        try {
          await redisClient.hset(
            MAP_PRESENCE_KEY(mapId),
            userId,
            JSON.stringify(userData)
          );
        } catch (err) {
          console.error("Redis error (join-map):", err);
        }
      }

      io.to(mapId).emit("user-joined", userData);
    });

    socket.on("move", async ({ userId, mapId, x, y }) => {
      if (!userId || !mapId)
        return socket.emit("error", "userId and mapId are required");

      if (userId !== String(user._id))
        return socket.emit("error", "Unauthorized: userId mismatch");

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
      if (!userId || !mapId)
        return socket.emit("error", "userId and mapId are required");

      if (userId !== String(user._id))
        return socket.emit("error", "Unauthorized: userId mismatch");

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
      console.log(
        `Presence user disconnected: ${socket.id}, userId: ${user._id}`
      );
    });
  } catch (err: any) {
    console.error("Presence socket authentication error:", err);
    socket.emit("unauthorized", err.message);
    socket.disconnect(true);
  }
};
