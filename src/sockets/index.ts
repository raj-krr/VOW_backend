import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import chatSocket from "./chatSocket";
import { setupPresenceSocket } from "./presenceSocket";
import { dmSocketHandler } from "./dmSocket";

export const initSocket = (server: HttpServer) => {
  const io = new IOServer(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL as string,
        "https://vow-org.me",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        process.env.RENDER_URL as string,
        process.env.FRONTEND_URL_PROD as string,
        process.env.FRONTEND_URL_DEV as string,
      ],
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type"],
    },
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: true,
    allowEIO3: true,
  });

  io.on("connection", async (socket) => {
    console.log("Socket user connected:", socket.id);

    try {
      // Initialize chat socket FIRST — it sets (socket as any).user
      await chatSocket(io, socket);
    } catch (err: any) {
      console.error("[socket] chatSocket init failed:", err.message);
    }

    try {
      // DM socket reuses user from chatSocket
      await dmSocketHandler(io, socket);
    } catch (err: any) {
      console.error("[socket] dmSocketHandler init failed:", err.message);
    }

    try {
      await setupPresenceSocket(io, socket);
    } catch (err: any) {
      console.error("[socket] presenceSocket init failed:", err.message);
    }

    socket.on("disconnect", (reason) => {
      console.log("Socket user disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", socket.id, error);
    });
  });

  console.log("Socket.IO initialized with chat, DM and presence modules");

  return io;
};