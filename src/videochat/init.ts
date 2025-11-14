import { Router, Request, Response, Application } from "express";
import { Server as HttpServer } from "http";
import { SFUServer } from "./server/sfu";
import { WebSocketSignalingServer } from "./server/websocket";
import logger from "./utils/logger";

export type VideoChatShutdownHandle = {
  wss?: WebSocketSignalingServer;
  shutdown?: () => void;
};


export function createVideoChatRouter(sfu: SFUServer) {
  const router = Router();

  router.post("/start", async (req: Request, res: Response) => {
    try {
      const { roomId, name } = req.body || {};

      if (roomId) {
        const room = await sfu.getRoom(String(roomId));
        if (!room) {
          logger.warn(`[videochat] start: provided roomId ${roomId} not found`);
          return res.status(404).json({ error: "Room not found" });
        }
        return res.json({ roomId: String(roomId) });
      }

      const roomName =
        typeof name === "string" && name.trim().length > 0
          ? name.trim()
          : `call-${Date.now()}`;

      const created = await sfu.createRoom(roomName);

      let newRoomId: string | undefined;
      if (!created) {
        logger.error("[videochat] createRoom returned falsy value");
        return res.status(500).json({ error: "Failed to create room" });
      } else if (typeof created === "string") {
        newRoomId = created;
      } else if (typeof created === "object") {
        newRoomId = (created as any).id ?? (created as any).roomId ?? (created as any).room?.id;
      }

      newRoomId = newRoomId ? String(newRoomId) : undefined;

      if (!newRoomId) {
        logger.warn("[videochat] createRoom did not return an id; attempting to derive it");
      }

      const room = newRoomId ? await sfu.getRoom(newRoomId) : undefined;

      if (!room) {
        logger.warn(`[videochat] room ${newRoomId ?? "<unknown>"} not found immediately after create — retrying once`);
        if (newRoomId) {
          await new Promise((r) => setTimeout(r, 50)); 
          const roomRetry = await sfu.getRoom(newRoomId);
          if (roomRetry) {
            return res.json({ roomId: newRoomId });
          }
        }

        if (created && typeof created === "object") {
          const guessId = (created as any).id ?? (created as any).roomId;
          if (guessId) {
            logger.info(`[videochat] returning guessed id ${guessId} even though getRoom couldn't find it`);
            return res.json({ roomId: String(guessId) });
          }
        }

        logger.error("[videochat] created room but could not find it with getRoom");
        return res.status(500).json({ error: "Room created but not available yet" });
      }

      // success
      return res.json({ roomId: newRoomId });
    } catch (err: any) {
      logger.error("Error starting call:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  router.post("/join", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.body || {};
      if (!roomId || typeof roomId !== "string") {
        return res.status(400).json({ error: "roomId is required to join" });
      }

      const room = await sfu.getRoom(String(roomId));
      if (!room) {
        logger.warn(`[videochat] join: attempted to join missing room ${roomId}`);
        return res.status(404).json({ error: "Room not found" });
      }

      return res.json({ success: true, roomId });
    } catch (err: any) {
      logger.error("Error joining call:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  return router;
}

export function attachSignalingServer(
  httpServer: HttpServer,
  sfu: SFUServer,
  path = "/signaling"
): VideoChatShutdownHandle {
  logger.info(`[videochat] attaching signaling server on path ${path}`);

  const wss = new WebSocketSignalingServer(httpServer, sfu, path);

  try {
    if (typeof (wss as any).on === "function") {
      (wss as any).on("listening", () => {
        logger.info("[videochat] signaling WebSocket server is listening");
      });

      (wss as any).on("error", (err: Error) => {
        logger.error("[videochat] signaling WebSocket server error:", err);
      });
    } else {
      throw new Error("no event listeners available");
    }
  } catch (e) {
    logger.warn("[videochat] signaling WebSocket server does not support event listeners");
  }

  const shutdown = () => {
    try {
      if (wss && typeof (wss as any).shutdown === "function") {
        (wss as any).shutdown();
      }
    } catch (err: any) {
      logger.error("Error during signaling shutdown:", err);
    }
  };

  return { wss, shutdown };
}

export async function initVideoChat(app: Application, server: HttpServer) {
  const sfu = new SFUServer(process.env.REDIS_URL);
  await sfu.initialize();

  const vcRouter = createVideoChatRouter(sfu);
  app.use("/videochat", vcRouter);

  const { wss, shutdown } = attachSignalingServer(server, sfu, "/signaling");

  logger.info("Videochat initialized: minimal REST mounted at /videochat, signaling at /signaling");

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
