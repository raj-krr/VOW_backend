import { Router, Request, Response } from "express";
import { Server as HttpServer } from "http";
import { SFUServer } from "./sfu";
import { WebSocketSignalingServer } from "./websocket";
import logger from "../utils/logger";

type VideoChatShutdownHandle = {
  wss?: WebSocketSignalingServer;
  shutdown?: () => void;
};


export function createVideoChatRouter(sfu: SFUServer) {
  const router = Router();

  // Create room
  router.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Room name is required" });
      }

      const roomId = await sfu.createRoom(name);
      return res.json({ roomId, name });
    } catch (err: any) {
      logger.error("Error creating room:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  // Get room info
  router.get("/api/rooms/:roomId", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = await sfu.getRoom(roomId);
      if (!room) return res.status(404).json({ error: "Room not found" });

      return res.json(room.getRoomState());
    } catch (err: any) {
      logger.error("Error getting room:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  // Delete room
  router.delete("/api/rooms/:roomId", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      await sfu.deleteRoom(roomId);
      return res.json({ success: true });
    } catch (err: any) {
      logger.error("Error deleting room:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  // SFU stats
  router.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await sfu.getStats();
      return res.json(stats);
    } catch (err: any) {
      logger.error("Error getting stats:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  // Chat history for a room
  router.get("/api/rooms/:roomId/chat", async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = await sfu.getRoom(roomId);
      if (!room) return res.status(404).json({ error: "Room not found" });

      const messages = room.getChatHistory ? room.getChatHistory() : [];
      return res.json({ messages });
    } catch (err: any) {
      logger.error("Error getting chat history:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  router.get("/health", (_req: Request, res: Response) => {
    return res.json({ status: "ok", timestamp: Date.now() });
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
