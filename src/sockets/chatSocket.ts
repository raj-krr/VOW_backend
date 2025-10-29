import { Server, Socket } from "socket.io";
import Message from "../models/message";
import Channel from "../models/channel";
import Workspace from "../models/workspace";
import { verifySocketToken, getTokenFromSocket } from "./auth";

export default function chatSocket(io: Server) {
  io.on("connection", async (socket: Socket) => {
    try {
      const token = getTokenFromSocket(socket) || (socket.handshake.auth && (socket.handshake.auth as any).token);
      const user = await verifySocketToken(token);
      (socket as any).user = user;

      socket.join(`user:${user._id}`);

      socket.on("join_server", async (serverId: string) => {
        const server = await Workspace.findById(serverId);
        if (!server) return socket.emit("error", "Server not found");
        if (server.members.map((m) => String(m)).includes(String(user._id))) {
          socket.join(`server:${serverId}`);
          socket.emit("joined_server", serverId);
        } else {
          socket.emit("error", "Not a member of server");
        }
      });

      socket.on("join_channel", async (channelId: string) => {
        const channel = await Channel.findById(channelId);
        if (!channel) return socket.emit("error", "Channel not found");
        socket.join(`channel:${channelId}`);
        socket.emit("joined_channel", channelId);
      });

      socket.on("send_message", async (payload: { channelId: string; content: string; attachments?: any[] }) => {
        try {
          const { channelId, content, attachments } = payload;
          // basic validation
          if (!content || !channelId) return socket.emit("error", "Invalid message");
          const channel = await Channel.findById(channelId);
          if (!channel) return socket.emit("error", "Channel not found");

          // create message
          const message = await Message.create({
            channelId,
            sender: (socket as any).user._id,
            content,
            attachments,
          });

          const populated = await Message.findById(message._id).populate("sender", "username avatar");

          // emit to everyone in channel
          io.to(`channel:${channelId}`).emit("receive_message", populated);
        } catch (err: any) {
          socket.emit("error", err.message || "Send message failed");
        }
      });

      socket.on("typing", (channelId: string) => {
        socket.to(`channel:${channelId}`).emit("user_typing", { userId: user._id });
      });
      socket.on("stop_typing", (channelId: string) => {
        socket.to(`channel:${channelId}`).emit("user_stop_typing", { userId: user._id });
      });

      // leave channel
      socket.on("leave_channel", (channelId: string) => {
        socket.leave(`channel:${channelId}`);
      });

      socket.on("disconnect", () => {
      });
    } catch (err: any) {
      socket.emit("unauthorized", err.message);
      socket.disconnect(true);
    }
  });
}
