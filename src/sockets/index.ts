import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import chatSocket from "./chatSocket";
import { setupPresenceSocket } from "./presenceSocket";


export const initSocket = (server: HttpServer) => {
  const io = new IOServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
      credentials: true,
    },
  });

  chatSocket(io);
  setupPresenceSocket(io);

  console.log("Socket.IO initialized with chat and presence modules");

  return io;
};
