import type { Server, Socket } from "socket.io";

export function registerWebRTCHandlers(io: Server, socket: Socket) {
  const forward = (event: string) => {
    socket.on(event, ({ to, ...data }) => {
      io.to(to).emit(event, { from: socket.id, ...data });
    });
  };

  forward("webrtc:offer");
  forward("webrtc:answer");
  forward("webrtc:ice-candidate");
}
