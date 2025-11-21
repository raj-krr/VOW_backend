import { Server, Socket } from "socket.io";
import { getRedis } from "../libs/redis";
import jwt from "jsonwebtoken";

const redisClient = getRedis();

const getWorkspaceToken = (socket: Socket) => {
  const raw = socket.handshake.headers.cookie;
  if (!raw) return null;

  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("="))
  );

  // cookie: workspaceToken_<workspaceId>
  const wsCookie = Object.keys(cookies).find((k) =>
    k.startsWith("workspaceToken_")
  );

  if (!wsCookie) return null;

  return {
    workspaceId: wsCookie.replace("workspaceToken_", ""),
    token: cookies[wsCookie],
  };
};

export const setupPresenceSocket = async (io: Server, socket: Socket) => {
  try {
    const ws = getWorkspaceToken(socket);
    if (!ws) throw new Error("Workspace authentication missing");

    const { workspaceId, token } = ws;

    const decoded: any = jwt.verify(
      token,
      process.env.WORKSPACE_JWT_SECRET!
    );

    const userId = decoded.userId;

    const key = `presence:workspace:${workspaceId}`;

    console.log(`Presence: User ${userId} connected to workspace ${workspaceId}`);

    // Join room
    socket.join(workspaceId);

    // Send currently connected users
    const users = await redisClient.hgetall(key);
    const parsed = Object.values(users).map((u) => JSON.parse(u));
    socket.emit("presence-sync", parsed);

    // JOIN
    socket.on("join", async ({ displayName,x, y }) => {
      const newUser = {
        userId,
        displayName: displayName || `User-${userId.slice(0, 6)}`,
        x: x || 50,
        y: y || 50,
        ts: Date.now(),
      };

      await redisClient.hset(key, userId, JSON.stringify(newUser));

        // Tell just this socket: "your identity is confirmed"
  socket.emit("join-ack", { userId });

      // Broadcast only to this workspace
      io.to(workspaceId).emit("user-joined", newUser);
    });

    // MOVE
    socket.on("move", async ({ x, y }) => {
      const existing = await redisClient.hget(key,userId);
      const currentUser = existing?JSON.parse(existing):{};

       const updated = { 
           userId,
          displayName:currentUser.displayName,
          x,
          y,
          ts:Date.now()
          };

      await redisClient.hset(key, userId, JSON.stringify(updated));

      io.to(workspaceId).emit("user-moved", updated);
    });

    // LEAVE
    socket.on("leave", async () => {
      await redisClient.hdel(key, userId);
      io.to(workspaceId).emit("user-left", { userId });
    });

    // DISCONNECT
    socket.on("disconnect", async () => {
      await redisClient.hdel(key, userId);
      io.to(workspaceId).emit("user-left", { userId });

      console.log(`Presence: User ${userId} disconnected from workspace ${workspaceId}`);
    });

  } catch (err: any) {
    console.error("Presence socket error:", err.message);
    socket.emit("unauthorized", err.message);
    socket.disconnect(true);
  }
};
