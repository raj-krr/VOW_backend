import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const presenceStore: Record<string, Record<string, any>> = {};

const getWorkspaceToken = (socket: Socket) => {
  const raw = socket.handshake.headers.cookie;
  if (!raw) return null;

  const cookies = Object.fromEntries(
    raw.split(";").map((c) => c.trim().split("="))
  );

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

    console.log(`Presence: User ${userId} connected to workspace ${workspaceId}`);

    socket.join(workspaceId);

    // init workspace store
    if (!presenceStore[workspaceId]) {
      presenceStore[workspaceId] = {};
    }

    // send current users
    const users = Object.values(presenceStore[workspaceId]);
    socket.emit("presence-sync", users);

    // JOIN
    socket.on("join", ({ displayName, x, y }) => {
      const newUser = {
        userId,
        displayName: displayName || `User-${userId.slice(0, 6)}`,
        x: x || 50,
        y: y || 50,
        ts: Date.now(),
      };

      presenceStore[workspaceId][userId] = newUser;

      socket.emit("join-ack", { userId });
      io.to(workspaceId).emit("user-joined", newUser);
    });

    // MOVE
    socket.on("move", ({ x, y }) => {
      const currentUser = presenceStore[workspaceId][userId] || {};

      const updated = {
        userId,
        displayName: currentUser.displayName || "User",
        x,
        y,
        ts: Date.now(),
      };

      presenceStore[workspaceId][userId] = updated;

      io.to(workspaceId).emit("user-moved", updated);
    });

    // LEAVE
    socket.on("leave", () => {
      delete presenceStore[workspaceId][userId];
      io.to(workspaceId).emit("user-left", { userId });
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      delete presenceStore[workspaceId][userId];
      io.to(workspaceId).emit("user-left", { userId });

      console.log(`Presence: User ${userId} disconnected from workspace ${workspaceId}`);
    });

  } catch (err: any) {
    console.error("Presence socket error:", err.message);
    socket.emit("unauthorized", err.message);
    socket.disconnect(true);
  }
};