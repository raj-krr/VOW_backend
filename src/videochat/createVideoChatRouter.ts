// src/videochat/createVideoChatRouter.ts
import { Router, Request, Response } from "express";
import logger from "./utils/logger";
import { SFUServer } from "./server/sfu";

export function createVideoChatRouter(sfu: SFUServer) {
  const router = Router();

  router.get("/rooms", (_req: Request, res: Response) => {
    logger.info(`[videochat:${process.pid}] /rooms requested`);
    return res.json({ rooms: sfu.listRooms() });
  });

  router.post("/start", async (req: Request, res: Response) => {
    try {
      const { roomId, name } = req.body || {};

      if (roomId) {
        const room = await sfu.getRoom(String(roomId));
        if (!room) {
          logger.warn(`[videochat] start: provided roomId ${roomId} not found`);
          logger.info(`[videochat] rooms-known: ${JSON.stringify(sfu.listRooms())}`);
          return res.status(404).json({ error: "Room not found" });
        }
        logger.info(`[videochat] start: validated provided roomId ${roomId}`);
        logger.info(`[videochat] rooms-known: ${JSON.stringify(sfu.listRooms())}`);
        return res.json({ roomId: String(roomId) });
      }

      const roomName =
        typeof name === "string" && name.trim().length > 0
          ? name.trim()
          : `call-${Date.now()}`;

      const createdId = await sfu.createRoom(roomName);

      let newRoomId = String(createdId);
      let room = sfu.getRoom(newRoomId);
      for (let i = 0; i < 10 && !room; i++) {
        await new Promise((r) => setTimeout(r, 100));
        room = sfu.getRoom(newRoomId);
      }

      if (!room) {

        logger.warn("[videochat] created room but could not find it locally after retries");
        logger.info(`[videochat] rooms-known after create: ${JSON.stringify(sfu.listRooms())}`);
        return res.json({ roomId: newRoomId });
      }

      logger.info(`[videochat] start: created new room ${newRoomId}`);
      logger.info(`[videochat] rooms-known after create: ${JSON.stringify(sfu.listRooms())}`);
      return res.json({ roomId: newRoomId });
    } catch (err: any) {
      logger.error("Error starting call:", err);
      return res.status(500).json({ error: err?.message ?? "unknown error" });
    }
  });

  router.post("/join", async (req: Request, res: Response) => {
    try {
      logger.info(`[videochat] join request headers: ${JSON.stringify({
        'content-type': req.get('content-type'),
        'content-length': req.get('content-length'),
        host: req.get('host')
      })}`);

      let body: any = req.body;
      if (typeof body === 'string') {
        const trimmed = body.trim();
        if (!trimmed) {
          logger.warn('[videochat] join: req.body is empty string');
          return res.status(400).json({ success: false, msg: 'Empty JSON body' });
        }
        try {
          body = JSON.parse(trimmed);
        } catch (err: any) {
          logger.error('[videochat] join: failed to JSON.parse(req.body) ->', err);
          return res.status(400).json({ success: false, msg: 'Malformed JSON body', detail: String(err.message) });
        }
      }

      logger.info(`[videochat] join body: ${JSON.stringify(body)}`);

      const { roomId } = body || {};
      if (!roomId || typeof roomId !== "string") {
        logger.warn('[videochat] join: missing or invalid roomId in request body');
        return res.status(400).json({ error: "roomId is required to join" });
      }

      logger.info(`[videochat] rooms-known at join time: ${JSON.stringify(sfu.listRooms())}`);

      const room = await sfu.getRoom(String(roomId));
      if (!room) {
        logger.warn(`[videochat] join: attempted to join missing room ${roomId}`);
        return res.status(404).json({ error: "Room not found" });
      }

      logger.info(`[videochat] join: room ${roomId} found; allowing join`);
      return res.json({ success: true, roomId });
    } catch (err: any) {
      logger.error('Unexpected error in /videochat/join handler:', err);
      return res.status(500).json({ success: false, msg: 'Internal error', detail: String(err?.message ?? err) });
    }
  });

  return router;
}
