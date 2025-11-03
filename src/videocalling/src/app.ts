import type { Application } from "express";
import { Server } from "socket.io";
import { buildRedisAdapter } from "./adapters/socketio-redis.js";
import { wrapSessionForSocketIO } from "./libs/session.js"; // use your main session middleware
import { initRedis } from "./libs/redis.js";
import { registerSocketHandlers } from "./handlers/socket.handler.js";
import { registerWebRTCHandlers } from "./handlers/webrtc.handler.js";
import { config } from "./config/index.js";

export async function initVideoCalling(app: Application, httpServer: import("http").Server) {
  await initRedis();

  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  wrapSessionForSocketIO(io);

  io.adapter(await buildRedisAdapter());

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
    registerWebRTCHandlers(io, socket);
    console.log("🎥 Video client connected:", socket.id);
  });

  console.log("✅ Video calling initialized successfully");
}
