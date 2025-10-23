import { createServer, get, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getRedis } from "../libs/redis";
import { createAdapter } from "socket.io-redis";
import Channel from "../models/chat/channel";
import Message from "../models/chat/message";

type SocketUser = { id: string; username?: string };

export function bindSockets(
  httpServer: HttpServer,
  opts: { redisUrl?: string; cors?: any } = {}
) {
  const { redisUrl = process.env.REDIS_URL, cors = { origin: "*" } } = opts;
  const io = new Server(httpServer, { cors });

  if (redisUrl) {
    const pubClient = getRedis();
    if (!pubClient) {
      console.warn("No REDIS_URL configured");
    } else {
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient as any, subClient as any));
      console.log("Socket.IO redis adapter attached using ioredis");
    }
  }

  io.use(async (socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth && (socket.handshake.auth as any).token) ||
        socket.handshake.headers["authorization"];
      if (!token) return next(new Error("Authentication error: token missing"));
      const raw = String(token).replace(/^Bearer\s+/i, "");
      const payload = jwt.verify(raw, process.env.JWT_SECRET as string) as any;
      (socket as any).user = {
        id: payload.sub || payload.id,
        username: payload.username || payload.name,
      } as SocketUser;
      return next();
    } catch (err) {
      console.warn("socket auth failed", (err as Error).message);
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as SocketUser;
    const uid = user?.id;
    console.log(`socket connected: ${socket.id} user=${uid}`);

    socket.on("join:channel", async ({ channelId }: { channelId: string }) => {
      try {
        if (!channelId) return socket.emit("error", "channelId required");
        const channel = await Channel.findById(channelId).lean();
        if (!channel) return socket.emit("error", "Channel not found");
        if (
          channel.type === "private" &&
          !channel.members.map(String).includes(String(uid))
        ) {
          return socket.emit("error", "Not a member of private channel");
        }
        await socket.join(String(channelId));
        socket.emit("channel:joined", { channelId });
        socket
          .to(String(channelId))
          .emit("presence:update", { userId: uid, status: "online" });
      } catch (err) {
        console.error(err);
        socket.emit("error", "Failed to join channel");
      }
    });

    socket.on("leave:channel", async ({ channelId }: { channelId: string }) => {
      try {
        if (!channelId) return;
        await socket.leave(String(channelId));
        socket
          .to(String(channelId))
          .emit("presence:update", { userId: uid, status: "offline" });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on(
      "message:create",
      async ({
        channelId,
        content = "",
        attachments = [],
        tempId = null,
      }: any) => {
        try {
          if (!channelId) return socket.emit("error", "channelId required");
          const channel = await Channel.findById(channelId);
          if (!channel) return socket.emit("error", "Channel not found");
          if (
            channel.type === "private" &&
            !channel.members.map(String).includes(String(uid))
          ) {
            return socket.emit("error", "Not a member");
          }

          const message = new Message({
            channelId,
            sender: uid,
            content,
            attachments,
          });
          await message.save();
          await message.populate("sender", "username");

          io.to(String(channelId)).emit("message:new", message);
          if (tempId)
            socket.emit("message:ack", {
              tempId,
              id: message._id,
              createdAt: message.createdAt,
            });
        } catch (err) {
          console.error("message:create error", err);
          socket.emit("error", "Failed to send message");
        }
      }
    );

    socket.on("typing:start", ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket
        .to(String(channelId))
        .emit("typing", { userId: uid, channelId, isTyping: true });
    });

    socket.on("typing:stop", ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket
        .to(String(channelId))
        .emit("typing", { userId: uid, channelId, isTyping: false });
    });

    socket.on("message:read", ({ channelId, lastReadAt = new Date() }: any) => {
      socket
        .to(String(channelId))
        .emit("read:update", { userId: uid, channelId, lastReadAt });
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `socket disconnect ${socket.id} user=${uid} reason=${reason}`
      );
      (socket.rooms as Set<string>).forEach((room) => {
        if (room !== socket.id) {
          socket
            .to(room)
            .emit("presence:update", { userId: uid, status: "offline" });
        }
      });
    });
  });

  return io;
}
