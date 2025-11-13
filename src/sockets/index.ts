import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import chatSocket from "./chatSocket";
import { setupPresenceSocket } from "./presenceSocket";


export const initSocket = (server: HttpServer) => {
  const io = new IOServer(server, {
     path: "/socket.io/",
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
    },
    transports: ["websocket", "polling"],
  });

  chatSocket(io);
  setupPresenceSocket(io);

  console.log("Socket.IO initialized with chat and presence modules");

  return io;
};
