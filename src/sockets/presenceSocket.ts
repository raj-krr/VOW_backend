import { Server, Socket } from "socket.io";
import { getRedis } from "../libs/redis";
import { verifySocketToken, getTokenFromSocket } from "./auth";

const redisClient = getRedis();
const PRESENCE_KEY = "presence:users"; 

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

    if (!token) throw new Error("No authentication token provided");

    const user = await verifySocketToken(token);

    console.log(`Presence connected: socket=${socket.id}, userId=${user._id}`);

    socket.on("join", async ({ userId, displayName }) => {
      if (!userId) return socket.emit("error", "userId is required");

      if (userId !== String(user._id))
        return socket.emit("error", "Unauthorized userId mismatch");

      const userData = {
        userId,
        displayName: displayName || user.username,
        x: 0,
        y: 0,
        ts: Date.now(),
      };

      if (redisClient) {
        await redisClient.hset(
          PRESENCE_KEY,
          userId,
          JSON.stringify(userData)
        );
      }

      io.emit("user-joined", userData); 
    });


    socket.on("move", async ({ userId, x, y }) => {
      if (!userId) return;

      if (userId !== String(user._id))
        return socket.emit("error", "Unauthorized userId mismatch");

      const updatedData = { userId, x, y, ts: Date.now() };

      if (redisClient) {
        await redisClient.hset(
          PRESENCE_KEY,
          userId,
          JSON.stringify(updatedData)
        );
      }

      io.emit("user-moved", updatedData); 
    });


    socket.on("leave", async ({ userId }) => {
      if (!userId) return;

      if (userId !== String(user._id))
        return socket.emit("error", "Unauthorized userId mismatch");

      if (redisClient) {
        await redisClient.hdel(PRESENCE_KEY, userId);
      }

      io.emit("user-left", { userId });
    });


    
    socket.on("disconnect", async () => {
      console.log(`Presence disconnected: ${socket.id}`);

    });

  } catch (err: any) {
    console.error("Presence socket auth error:", err.message);
    socket.emit("unauthorized", err.message);
    socket.disconnect(true);
  }
};
