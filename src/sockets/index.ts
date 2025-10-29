import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import chatSocket from "./chatSocket";

export const initSocket = (server: HttpServer) => {
  const io = new IOServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL as string || "http://localhost:5173"],
      credentials: true,
    },
  });

  chatSocket(io);

  return io;
};