import { Server, Socket } from "socket.io";
import { verifySocketToken, getTokenFromSocket } from "./auth";

const presenceStore: Record<string, Record<string, any>> = {};

const getRoomName = (wsId?: string) => {
  if (!wsId || wsId === "undefined" || wsId === "null") return "workspace:global";
  return wsId.startsWith("workspace:") ? wsId : `workspace:${wsId}`;
};

export const setupPresenceSocket = async (io: Server, socket: Socket) => {
  try {
    let user = (socket as any).user;

    if (!user) {
      const token =
        getTokenFromSocket(socket) ||
        (socket.handshake.auth && (socket.handshake.auth as any).token);

      if (token) {
        try {
          user = (await verifySocketToken(token)) as any;
          (socket as any).user = user;
        } catch (e) {}
      }
    }

    if (!user) return;

    const userId = user._id.toString();
    const defaultUsername =
      user.fullName || user.username || (user.email ? user.email.split("@")[0] : "User");
    const avatarUrl = user.avatar || "";

    socket.join(`user:${userId}`);

    socket.on("join", ({ workspaceId, displayName, avatar, x, y }: any) => {
      const roomName = getRoomName(workspaceId);
      socket.join(roomName);

      if (!presenceStore[roomName]) {
        presenceStore[roomName] = {};
      }

      const activeUser = {
        userId,
        displayName: displayName || defaultUsername,
        avatar: avatar || avatarUrl,
        x: typeof x === "number" && !isNaN(x) ? x : (presenceStore[roomName]?.[userId]?.x ?? 60),
        y: typeof y === "number" && !isNaN(y) ? y : (presenceStore[roomName]?.[userId]?.y ?? 60),
        ts: Date.now(),
      };

      presenceStore[roomName][userId] = activeUser;

      socket.emit("join-ack", { userId });

      // Send active map users to joining client
      socket.emit("presence-sync", Object.values(presenceStore[roomName]));

      // Broadcast join to all workspace members
      socket.to(roomName).emit("user-joined", activeUser);
      console.log(`[presence] ✓ User ${activeUser.displayName} (${userId}) joined room ${roomName}`);
    });

    socket.on("move", ({ workspaceId, x, y, displayName, avatar }: any) => {
      const roomName = getRoomName(workspaceId);
      socket.join(roomName);

      if (!presenceStore[roomName]) {
        presenceStore[roomName] = {};
      }

      const updated = {
        userId,
        displayName: displayName || presenceStore[roomName]?.[userId]?.displayName || defaultUsername,
        avatar: avatar || presenceStore[roomName]?.[userId]?.avatar || avatarUrl,
        x,
        y,
        ts: Date.now(),
      };

      presenceStore[roomName][userId] = updated;

      // Real-time broadcast to all other workspace users in room
      socket.to(roomName).emit("user-moved", updated);
    });

    socket.on("collision_call", (payload: any) => {
      try {
        const { workspaceId, targetUserId, callerId, callerName, callerAvatar, roomId, callerSocketId } = payload || {};
        console.log(`[presence] 🤝 collision_call from ${callerName} (${callerId || userId}) to ${targetUserId} in room ${roomId}`);
        const eventData = {
          callerId: callerId || userId,
          callerName: callerName || defaultUsername,
          callerAvatar: callerAvatar || avatarUrl,
          callerSocketId: callerSocketId || socket.id,
          targetUserId,
          roomId,
          workspaceId,
        };

        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit("collision_call_incoming", eventData);
        }

        const roomName = getRoomName(workspaceId);
        socket.to(roomName).emit("collision_call_incoming", eventData);
        socket.broadcast.emit("collision_call_incoming", eventData);
      } catch (err: any) {
        console.error("[presence] collision_call error:", err.message);
      }
    });

    socket.on("leave", ({ workspaceId }: any) => {
      try {
        const roomName = getRoomName(workspaceId);
        if (presenceStore[roomName]?.[userId]) {
          delete presenceStore[roomName][userId];
          io.to(roomName).emit("user-left", { userId });
          console.log(`[presence] 🏃 User ${userId} left room ${roomName}`);
        }
      } catch (err: any) {
        console.error("[presence] leave error:", err.message);
      }
    });

    socket.on("collision_call_ended", (payload: any) => {
      try {
        const { workspaceId, targetUserId, callerId, roomId, callerSocketId } = payload || {};
        console.log(`[presence] 📴 collision_call_ended from ${callerId || userId} to ${targetUserId} in room ${roomId}`);
        const eventData = {
          callerId: callerId || userId,
          callerSocketId: callerSocketId || socket.id,
          targetUserId,
          roomId,
          workspaceId,
        };

        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit("collision_call_ended", eventData);
        }

        const roomName = getRoomName(workspaceId);
        socket.to(roomName).emit("collision_call_ended", eventData);
        socket.broadcast.emit("collision_call_ended", eventData);
      } catch (err: any) {
        console.error("[presence] collision_call_ended error:", err.message);
      }
    });

    socket.on("peer_media_toggle", (payload: any) => {
      try {
        const { targetUserId, roomId, isVideoOff, isMuted, workspaceId } = payload || {};
        const eventData = {
          callerId: userId,
          roomId,
          isVideoOff,
          isMuted,
        };
        if (targetUserId) {
          io.to(`user:${targetUserId}`).emit("peer_media_toggle", eventData);
        }
        const roomName = getRoomName(workspaceId);
        socket.to(roomName).emit("peer_media_toggle", eventData);
      } catch (err: any) {
        console.error("[presence] peer_media_toggle error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      Object.keys(presenceStore).forEach((roomName) => {
        if (presenceStore[roomName]?.[userId]) {
          delete presenceStore[roomName][userId];
          io.to(roomName).emit("user-left", { userId });
        }
      });
    });
  } catch (err: any) {
    console.error("[presenceSocket] Error:", err.message);
  }
};