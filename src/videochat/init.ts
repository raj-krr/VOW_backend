// src/videochat/init.ts
import { Application, Router } from "express";
import { Server as HttpServer } from "http";
import { SFUServer } from "./server/sfu";
import { WebSocketSignalingServer } from "./server/websocket";
import logger from "./utils/logger"; // adjust if your logger path differs

export async function initVideoChat(app: Application, server: HttpServer) {
  const sfu = new SFUServer(process.env.REDIS_URL);
  await sfu.initialize();

  // mount existing routes under /videochat
  const router = Router();
  router.get('/health', (req,res)=>res.json({ ok:true }));
  app.use('/videochat', router);

  // attach signaling websocket on same HTTP server
  const wss = new WebSocketSignalingServer(server, sfu);

  return {
    sfu,
    wss,
    shutdown: async () => {
      try { wss.shutdown(); } catch(e){ logger.warn(String(e)); }
      try { await sfu.shutdown(); } catch(e){ logger.warn(String(e)); }
    }
  };
}
