import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import chatSocket from "./chatSocket";
import { setupPresenceSocket } from "./presenceSocket";

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
  });

  io.on("connection", (socket) => {
    console.log("Socket user connected:", socket.id);
    chatSocket(io, socket);
    setupPresenceSocket(io, socket);
  });

  // Fixed: "disconnect" not "disconnected"
  io.on("disconnect", (socket) => {
    console.log("Socket user disconnected", socket.id);
  });

  console.log("Socket.IO initialized with chat and presence modules");

  return io;
};