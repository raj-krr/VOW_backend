import { Application } from "express";
import { Server as HttpServer } from "http";
import { SFUServer } from "./server/sfu";
import logger from "./utils/logger";
import { createVideoChatRouter, attachSignalingServer } from "./server/index";


export async function initVideoChat(app: Application, server: HttpServer) {
  const sfu = new SFUServer(process.env.REDIS_URL);
  await sfu.initialize();

  const vcRouter = createVideoChatRouter(sfu);
  app.use("/videochat", vcRouter);

  const { wss, shutdown } = attachSignalingServer(server, sfu, "/signaling");

  logger.info("Videochat initialized: REST mounted at /videochat, signaling at /signaling");

  return {
    sfu,
    wss,
    shutdown: async () => {
      try {
        shutdown && shutdown();
      } catch (e) {
        logger.warn("Error shutting down signaling:", e);
      }
      try {
        await sfu.shutdown();
      } catch (e) {
        logger.warn("Error shutting down sfu:", e);
      }
    },
  };
}
