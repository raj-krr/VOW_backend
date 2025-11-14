// src/videochat/init.ts
import { Application } from "express";
import { Server as HttpServer } from "http";
import logger from "./utils/logger";

import SFUServer from "./server/sfu";
import { createVideoChatRouter } from "./createVideoChatRouter";
import { WebSocketSignalingServer } from "./server/websocket";

export type VideoChatShutdownHandle = {
  wss?: WebSocketSignalingServer;
  shutdown?: () => Promise<void>;
};


export async function initVideoChat(app: Application, server: HttpServer) {
  const sfu = new SFUServer(process.env.REDIS_URL);
  await sfu.initialize();

  const vcRouter = createVideoChatRouter(sfu);
  app.use("/videochat", vcRouter);

  logger.info(`[videochat] attaching signaling server on path /signaling`);
  const wss = new WebSocketSignalingServer(server, sfu, "/signaling");

  try {
    (wss as any).on?.("listening", () => {
      logger.info("[videochat] signaling WebSocket server is listening");
    });

    (wss as any).on?.("error", (err: Error) => {
      logger.error("[videochat] signaling WebSocket server error:", err);
    });
  } catch (e) {
    logger.warn("[videochat] signaling WebSocket server event wiring failed", e);
  }

  logger.info(
    `[videochat] Videochat initialized: REST at /videochat, signaling at /signaling (PID=${process.pid})`
  );

  return {
    sfu,
    wss,
    shutdown: async () => {
      try {
        if (typeof (wss as any).shutdown === "function") {
          (wss as any).shutdown();
        }
      } catch (e) {
        logger.warn("Error shutting down signaling:", e);
      }

      try {
        await sfu.shutdown();
      } catch (e) {
        logger.warn("Error shutting down sfu:", e);
      }
    },
  } as VideoChatShutdownHandle & { sfu: SFUServer; wss: WebSocketSignalingServer };
}
