import type { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service.js";
import { presenceService } from "../services/presence.service.js";

export function registerSocketHandlers(io: Server, socket: Socket) {
  const req = socket.request as any;
  const user = req.session?.user;

  if (!user) {
    console.warn("Unauthorized socket connection:", socket.id);
    socket.disconnect(true);
    return;
  }

  // Create a room
  socket.on("room:create", async (_, cb) => {
    const roomId = await roomService.createRoom(user);
    cb({ ok: true, roomId });
  });

  // Join room
  socket.on("room:join", async ({ roomId }, cb) => {
    const result = await roomService.joinRoom(roomId, user, socket.id);
    if (!result.ok) return cb(result);

    socket.join(roomId);
    io.to(roomId).emit("participant:joined", { socketId: socket.id, name: user.name });
    cb({ ok: true, participants: result.participants });
  });

  // Leave room
  socket.on("room:leave", async ({ roomId }, cb) => {
    await roomService.leaveRoom(roomId, user, socket.id);
    socket.leave(roomId);
    io.to(roomId).emit("participant:left", { socketId: socket.id });
    cb?.({ ok: true });
  });

  // Chat message
  socket.on("chat:send", ({ roomId, text }) => {
    const msg = { name: user.name, text, at: Date.now() };
    io.to(roomId).emit("chat:message", msg);
  });

  socket.on("disconnect", async () => {
    await presenceService.removeParticipant(socket.id);
  });
}
